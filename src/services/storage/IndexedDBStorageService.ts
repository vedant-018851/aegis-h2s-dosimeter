// ============================================================================
// IndexedDB-backed StorageService implementation (spec §21).
// ============================================================================

import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type {
  CalibrationSample,
  Measurement,
  ModelMetadata,
  Shift,
  Worker,
  Wristband,
} from '../../types';
import type { StorageService } from './StorageService';

const DB_NAME = 'h2s-dosimeter';
const DB_VERSION = 2; // v2: repairs stores left behind by older/mismatched schemas

interface H2SDBSchema extends DBSchema {
  workers: { key: string; value: Worker };
  shifts: { key: string; value: Shift; indexes: { workerId: string } };
  wristbands: { key: string; value: Wristband };
  measurements: { key: string; value: Measurement; indexes: { workerId: string; timestamp: number } };
  calibrationSamples: { key: string; value: CalibrationSample };
  modelMetadata: { key: string; value: ModelMetadata };
}

// ----------------------------------------------------------------------------
// Backward-compatible read-time defaults (spec §7): records written by an
// older build of this app won't have the newer optional fields. Rather than
// bump the DB schema/version, default them on the way out so every caller
// can rely on the fields being present without a migration step.
// ----------------------------------------------------------------------------
function normaliseWristband(wb: Wristband): Wristband {
  return { usedAt: null, usedByMeasurementId: null, ...wb };
}
function normaliseMeasurement(m: Measurement): Measurement {
  return {
    ...m,
    rejectionCode: m.rejectionCode ?? null,
    captureMethod: m.captureMethod ?? (m.isDemo ? 'demo' : 'camera'),
    alignmentMethod: m.alignmentMethod ?? (m.isDemo ? 'demo' : 'manual'),
    imageWidth: m.imageWidth ?? 0,
    imageHeight: m.imageHeight ?? 0,
    wristbandQrVerified: m.wristbandQrVerified ?? false,
  };
}

export class IndexedDBStorageService implements StorageService {
  private db: IDBPDatabase<H2SDBSchema> | null = null;

  private async open(): Promise<IDBPDatabase<H2SDBSchema>> {
    let conn: IDBPDatabase<H2SDBSchema> | undefined;
    conn = await openDB<H2SDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(typedDb, _old, _new, typedTx) {
        const db = typedDb as unknown as IDBPDatabase;
        const tx = typedTx as unknown as IDBPTransaction<unknown, string[], 'versionchange'>;
        // [store, keyPath, indexes]. A store with the wrong keyPath or missing
        // indexes (left by an older build) is dropped and recreated.
        const spec: [string, string, string[]][] = [
          ['workers', 'id', []],
          ['shifts', 'id', ['workerId']],
          ['wristbands', 'id', []],
          ['measurements', 'id', ['workerId', 'timestamp']],
          ['calibrationSamples', 'id', []],
          ['modelMetadata', 'version', []],
        ];
        for (const [name, keyPath, indexes] of spec) {
          if (db.objectStoreNames.contains(name)) {
            const st = tx.objectStore(name);
            const ok = st.keyPath === keyPath && indexes.every((i) => st.indexNames.contains(i));
            if (ok) continue;
            db.deleteObjectStore(name);
          }
          const store = db.createObjectStore(name, { keyPath });
          for (const i of indexes) store.createIndex(i, i);
        }
      },
      blocking() {
        // Another tab needs to upgrade: release our connection.
        conn?.close();
      },
    });
    return conn;
  }

  async init(): Promise<void> {
    if (this.db) return;
    try {
      this.db = await this.open();
    } catch (err) {
      // Corrupted / unusable database: delete it once and start clean.
      console.warn('IndexedDB open failed, resetting local database', err);
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
      this.db = await this.open();
    }
  }

  private get database(): IDBPDatabase<H2SDBSchema> {
    if (!this.db) throw new Error('StorageService.init() must be awaited before use.');
    return this.db;
  }

  // ---- Workers -------------------------------------------------------
  async listWorkers(): Promise<Worker[]> {
    return this.database.getAll('workers');
  }
  async getWorker(id: string): Promise<Worker | null> {
    return (await this.database.get('workers', id)) ?? null;
  }
  async putWorker(worker: Worker): Promise<void> {
    await this.database.put('workers', worker);
  }
  async deleteWorker(id: string): Promise<void> {
    const [worker, shifts, measurements] = await Promise.all([
      this.getWorker(id),
      this.listShifts(id),
      this.listMeasurements(),
    ]);
    if (!worker) return;
    if (shifts.some((s) => s.status === 'active')) throw new Error(`Cannot delete worker ${id} while an active shift references them.`);
    if (measurements.some((m) => m.workerId === id)) throw new Error(`Cannot delete worker ${id} while measurement history references them.`);
    await this.database.delete('workers', id);
  }

  // ---- Shifts ----------------------------------------------------------
  async listShifts(workerId?: string): Promise<Shift[]> {
    if (workerId) return this.database.getAllFromIndex('shifts', 'workerId', workerId);
    return this.database.getAll('shifts');
  }
  async getActiveShift(workerId: string): Promise<Shift | null> {
    const shifts = await this.listShifts(workerId);
    return shifts.find((s) => s.status === 'active') ?? null;
  }
  async putShift(shift: Shift): Promise<void> {
    // Shift state is intentionally one-way: active <-> ended is not allowed.
    // In particular, an ended shift must never be reopened as active.
    if (shift.status === 'active' && shift.endedAt !== null) {
      throw new Error(`Active shift ${shift.id} must have endedAt === null.`);
    }
    if (shift.status === 'ended' && shift.endedAt === null) {
      throw new Error(`Ended shift ${shift.id} must have a non-null endedAt.`);
    }

    const existingShift = await this.database.get('shifts', shift.id);
    if (existingShift?.status === 'ended' && shift.status === 'active') {
      throw new Error(`Ended shift ${shift.id} cannot be reopened as active.`);
    }

    if (shift.status === 'active') {
      const [worker, wristband, existing] = await Promise.all([
        this.getWorker(shift.workerId),
        this.getWristband(shift.wristbandId),
        this.listShifts(),
      ]);
      if (!worker) throw new Error(`Shift references missing worker ${shift.workerId}.`);
      if (!wristband) throw new Error(`Shift references missing wristband ${shift.wristbandId}.`);
      if (worker.wristbandId !== shift.wristbandId || wristband.assignedWorkerId !== shift.workerId) {
        throw new Error('Active shift worker/wristband assignment is inconsistent.');
      }
      if (wristband.usedAt || wristband.status === 'retired' || wristband.status === 'expired' || wristband.expiresAt <= Date.now()) {
        throw new Error(`Wristband ${shift.wristbandId} is not valid for a new active shift.`);
      }
      if (existing.some((s) => s.status === 'active' && s.id !== shift.id && (s.workerId === shift.workerId || s.wristbandId === shift.wristbandId))) {
        throw new Error('Worker or wristband is already linked to another active shift.');
      }
    }
    await this.database.put('shifts', shift);
  }

  // ---- Wristbands --------------------------------------------------------
  async listWristbands(): Promise<Wristband[]> {
    return (await this.database.getAll('wristbands')).map(normaliseWristband);
  }
  async getWristband(id: string): Promise<Wristband | null> {
    const wb = await this.database.get('wristbands', id);
    return wb ? normaliseWristband(wb) : null;
  }
  async putWristband(wristband: Wristband): Promise<void> {
    const existing = await this.getWristband(wristband.id);
    if (existing) {
      if (existing.usedAt && !wristband.usedAt) {
        throw new Error(`Wristband ${wristband.id} is already consumed and cannot be reopened.`);
      }
      if (existing.usedAt && wristband.usedByMeasurementId !== existing.usedByMeasurementId) {
        throw new Error(`Wristband ${wristband.id} already references measurement ${existing.usedByMeasurementId ?? 'history'}.`);
      }
      const activeShift = await this.getActiveShiftForWristband(wristband.id);
      if (activeShift && (wristband.status !== existing.status || wristband.assignedWorkerId !== existing.assignedWorkerId)) {
        throw new Error(`Cannot change wristband ${wristband.id} while it is linked to active shift ${activeShift.id}. End the shift first.`);
      }
      if (existing.status === 'retired' && wristband.status !== 'retired') {
        throw new Error(`Wristband ${wristband.id} is retired and cannot be reactivated.`);
      }
    }
    await this.database.put('wristbands', wristband);
  }

  async assignWristband(wristbandId: string, workerId: string): Promise<void> {
    const tx = this.database.transaction(['wristbands', 'workers', 'shifts'], 'readwrite');
    const [wb, worker, activeShifts] = await Promise.all([
      tx.objectStore('wristbands').get(wristbandId),
      tx.objectStore('workers').get(workerId),
      tx.objectStore('shifts').getAll(),
    ]);
    if (!wb) { throw new Error(`Wristband ${wristbandId} was not found.`); }
    if (!worker) { throw new Error(`Worker ${workerId} was not found.`); }
    const band = normaliseWristband(wb);
    if (activeShifts.some((s: Shift) => s.wristbandId === wristbandId && s.status === 'active')) {
      throw new Error(`Cannot assign ${wristbandId} while it is linked to an active shift.`);
    }
    if (band.usedAt || band.status === 'retired' || band.status === 'expired' || band.expiresAt <= Date.now()) {
      throw new Error(`Wristband ${wristbandId} is not available for assignment.`);
    }
    if (band.assignedWorkerId && band.assignedWorkerId !== workerId) {
      throw new Error(`Wristband ${wristbandId} is already assigned to another worker.`);
    }
    if (worker.wristbandId && worker.wristbandId !== wristbandId) {
      throw new Error(`Worker ${worker.name} already has wristband ${worker.wristbandId}.`);
    }
    await tx.objectStore('wristbands').put({ ...band, status: 'assigned', assignedWorkerId: workerId });
    await tx.objectStore('workers').put({ ...worker, wristbandId, updatedAt: Date.now() });
    await tx.done;
  }

  async releaseWristband(wristbandId: string): Promise<void> {
    const tx = this.database.transaction(['wristbands', 'workers', 'shifts'], 'readwrite');
    const [wb, workers, activeShifts] = await Promise.all([
      tx.objectStore('wristbands').get(wristbandId),
      tx.objectStore('workers').getAll(),
      tx.objectStore('shifts').getAll(),
    ]);
    if (!wb) { throw new Error(`Wristband ${wristbandId} was not found.`); }
    if (activeShifts.some((s: Shift) => s.wristbandId === wristbandId && s.status === 'active')) {
      throw new Error(`Cannot unassign ${wristbandId} while it is linked to an active shift. End the shift first.`);
    }
    const band = normaliseWristband(wb);
    if (band.usedAt) {
      throw new Error(`Wristband ${wristbandId} has already been used and cannot be unassigned.`);
    }
    await tx.objectStore('wristbands').put({ ...band, status: band.status === 'retired' ? 'retired' : 'available', assignedWorkerId: null });
    for (const worker of workers as Worker[]) {
      if (worker.wristbandId === wristbandId) {
        await tx.objectStore('workers').put({ ...worker, wristbandId: null, updatedAt: Date.now() });
      }
    }
    await tx.done;
  }

  // ---- Measurements --------------------------------------------------------
  async listMeasurements(): Promise<Measurement[]> {
    const all = await this.database.getAll('measurements');
    return all.map(normaliseMeasurement).sort((a, b) => b.timestamp - a.timestamp);
  }
  async getMeasurement(id: string): Promise<Measurement | null> {
    const m = await this.database.get('measurements', id);
    return m ? normaliseMeasurement(m) : null;
  }
  async putMeasurement(measurement: Measurement): Promise<void> {
    const [worker, wristband, shift] = await Promise.all([
      measurement.workerId ? this.getWorker(measurement.workerId) : Promise.resolve(null),
      measurement.wristbandId ? this.getWristband(measurement.wristbandId) : Promise.resolve(null),
      measurement.shiftId ? this.database.get('shifts', measurement.shiftId) : Promise.resolve(null),
    ]);
    if (measurement.workerId && !worker) throw new Error(`Measurement references missing worker ${measurement.workerId}.`);
    if (measurement.wristbandId && !wristband) throw new Error(`Measurement references missing wristband ${measurement.wristbandId}.`);
    if (measurement.shiftId && !shift) throw new Error(`Measurement references missing shift ${measurement.shiftId}.`);
    if (shift && (shift.workerId !== measurement.workerId || shift.wristbandId !== measurement.wristbandId)) {
      throw new Error('Measurement worker, shift and wristband references do not match.');
    }
    if (wristband && measurement.workerId && wristband.assignedWorkerId && wristband.assignedWorkerId !== measurement.workerId) {
      throw new Error('Measurement worker does not match the wristband assignment.');
    }
    await this.database.put('measurements', measurement);
  }

  async commitMeasurement(measurement: Measurement): Promise<void> {
    if (measurement.status === 'accepted' && measurement.dose && measurement.wristbandId && !measurement.isDemo) {
      const tx = this.database.transaction(['measurements', 'wristbands', 'workers', 'shifts'], 'readwrite');
      const [wristband, worker, shift] = await Promise.all([
        tx.objectStore('wristbands').get(measurement.wristbandId),
        measurement.workerId ? tx.objectStore('workers').get(measurement.workerId) : Promise.resolve(null),
        measurement.shiftId ? tx.objectStore('shifts').get(measurement.shiftId) : Promise.resolve(null),
      ]);
      if (!wristband) { throw new Error(`Wristband ${measurement.wristbandId} was not found.`); }
      if (measurement.workerId && !worker) { throw new Error(`Worker ${measurement.workerId} was not found.`); }
      if (measurement.shiftId && !shift) { throw new Error(`Shift ${measurement.shiftId} was not found.`); }
      if (!measurement.workerId || !measurement.shiftId || !shift || shift.status !== 'active') {
        throw new Error('An accepted real measurement must belong to an active worker shift.');
      }
      if (shift.workerId !== measurement.workerId || shift.wristbandId !== measurement.wristbandId) {
        throw new Error('Measurement worker, shift and wristband references do not match.');
      }
      const wb = normaliseWristband(wristband);
      if (wb.assignedWorkerId !== measurement.workerId || worker?.wristbandId !== measurement.wristbandId) {
        throw new Error('Measurement does not match the current worker/wristband assignment.');
      }
      if (wb.usedAt || wb.status === 'retired' || wb.status === 'expired' || wb.expiresAt <= Date.now()) {
        throw new Error('This wristband is no longer available for a new measurement.');
      }
      await tx.objectStore('measurements').put(measurement);
      await tx.objectStore('wristbands').put({ ...wb, usedAt: Date.now(), usedByMeasurementId: measurement.id });
      await tx.done;
      return;
    }
    await this.putMeasurement(measurement);
  }
  async deleteMeasurement(id: string): Promise<void> {
    const measurement = await this.getMeasurement(id);
    if (!measurement) return;
    if (measurement.status === 'accepted' && !measurement.isDemo) {
      throw new Error('Accepted real measurements are traceability records and cannot be deleted.');
    }
    await this.database.delete('measurements', id);
  }

  // ---- Calibration --------------------------------------------------------
  async listCalibrationSamples(): Promise<CalibrationSample[]> {
    const all = await this.database.getAll('calibrationSamples');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }
  async putCalibrationSample(sample: CalibrationSample): Promise<void> {
    await this.database.put('calibrationSamples', sample);
  }
  async deleteCalibrationSample(id: string): Promise<void> {
    await this.database.delete('calibrationSamples', id);
  }

  // ---- Model metadata --------------------------------------------------------
  async getActiveModelMetadata(): Promise<ModelMetadata | null> {
    const all = await this.database.getAll('modelMetadata');
    if (all.length === 0) return null;
    return all.sort((a, b) => b.activatedAt - a.activatedAt)[0];
  }
  async putModelMetadata(meta: ModelMetadata): Promise<void> {
    await this.database.put('modelMetadata', meta);
  }

  // ---- Bulk --------------------------------------------------------
  async wipeAllData(): Promise<void> {
    const db = this.database;
    const tx = db.transaction(
      ['workers', 'shifts', 'wristbands', 'measurements', 'calibrationSamples', 'modelMetadata'],
      'readwrite'
    );
    await Promise.all([
      tx.objectStore('workers').clear(),
      tx.objectStore('shifts').clear(),
      tx.objectStore('wristbands').clear(),
      tx.objectStore('measurements').clear(),
      tx.objectStore('calibrationSamples').clear(),
      tx.objectStore('modelMetadata').clear(),
      tx.done,
    ]);
  }

  async exportAllJSON(): Promise<Record<string, unknown>> {
    const [workers, shifts, wristbands, measurements, calibrationSamples, modelMetadata] = await Promise.all([
      this.listWorkers(),
      this.listShifts(),
      this.listWristbands(),
      this.listMeasurements(),
      this.listCalibrationSamples(),
      this.getActiveModelMetadata(),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      app: 'Aegis H\u2082S prototype',
      dataOrigin: 'local-device-indexeddb',
      workers,
      shifts,
      wristbands,
      measurements,
      calibrationSamples,
      modelMetadata,
    };
  }
}

export const storageService: StorageService = new IndexedDBStorageService();
