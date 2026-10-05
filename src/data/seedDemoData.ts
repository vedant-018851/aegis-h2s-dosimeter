import { storageService } from '../services/storage';
import { DEMO_MEASUREMENTS, DEMO_SHIFTS, DEMO_WORKERS, DEMO_WRISTBANDS } from './demoSeed';
import { generateDemoCalibrationSamples } from './demoCalibrationSeed';

type Group = { name: string; list: () => Promise<unknown[]>; put: () => Promise<void>[] };

/**
 * Seeds each collection independently: an empty collection is filled, a
 * populated one is left alone (unless `force`). One failing write never blocks
 * the rest. Returns human-readable errors (empty array = success).
 */
export async function seedDemoData(force = false): Promise<string[]> {
  const s = storageService;
  const groups: { name: string; list: () => Promise<unknown[]>; items: unknown[]; put: (x: never) => Promise<void> }[] = [
    { name: 'workers', list: () => s.listWorkers(), items: DEMO_WORKERS, put: (x) => s.putWorker(x) },
    { name: 'wristbands', list: () => s.listWristbands(), items: DEMO_WRISTBANDS, put: (x) => s.putWristband(x) },
    { name: 'shifts', list: () => s.listShifts(), items: DEMO_SHIFTS, put: (x) => s.putShift(x) },
    { name: 'measurements', list: () => s.listMeasurements(), items: DEMO_MEASUREMENTS, put: (x) => s.putMeasurement(x) },
    { name: 'calibration samples', list: () => s.listCalibrationSamples(), items: generateDemoCalibrationSamples(), put: (x) => s.putCalibrationSample(x) },
  ];
  const errors: string[] = [];
  for (const g of groups) {
    try {
      if (!force && (await g.list()).length > 0) continue;
      for (const item of g.items) await g.put(item as never);
    } catch (e) {
      errors.push(`${g.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return errors;
}
export type { Group };
