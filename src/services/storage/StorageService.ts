// ============================================================================
// StorageService — the one interface the rest of the app talks to for
// persistence (spec §21). The concrete implementation today is IndexedDB
// (IndexedDBStorageService.ts). A future REST/Supabase/Firebase backend only
// needs to implement this same interface and be swapped in at the call site
// in context/AppContext.tsx — no UI code changes required.
// ============================================================================

import type {
  CalibrationSample,
  Measurement,
  ModelMetadata,
  Shift,
  Worker,
  Wristband,
} from '../../types';

export interface StorageService {
  init(): Promise<void>;

  // Workers
  listWorkers(): Promise<Worker[]>;
  getWorker(id: string): Promise<Worker | null>;
  putWorker(worker: Worker): Promise<void>;
  deleteWorker(id: string): Promise<void>;

  // Shifts
  listShifts(workerId?: string): Promise<Shift[]>;
  getActiveShift(workerId: string): Promise<Shift | null>;
  putShift(shift: Shift): Promise<void>;

  // Wristbands
  listWristbands(): Promise<Wristband[]>;
  getWristband(id: string): Promise<Wristband | null>;
  putWristband(wristband: Wristband): Promise<void>;
  assignWristband(wristbandId: string, workerId: string): Promise<void>;
  releaseWristband(wristbandId: string): Promise<void>;

  // Measurements
  listMeasurements(): Promise<Measurement[]>;
  getMeasurement(id: string): Promise<Measurement | null>;
  putMeasurement(measurement: Measurement): Promise<void>;
  /** Commit a measurement and, for an accepted real reading, consume its wristband atomically. */
  commitMeasurement(measurement: Measurement): Promise<void>;
  deleteMeasurement(id: string): Promise<void>;

  // Calibration
  listCalibrationSamples(): Promise<CalibrationSample[]>;
  putCalibrationSample(sample: CalibrationSample): Promise<void>;
  deleteCalibrationSample(id: string): Promise<void>;

  // Model metadata
  getActiveModelMetadata(): Promise<ModelMetadata | null>;
  putModelMetadata(meta: ModelMetadata): Promise<void>;

  // Bulk / maintenance
  wipeAllData(): Promise<void>;
  exportAllJSON(): Promise<Record<string, unknown>>;
}
