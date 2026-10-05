// ============================================================================
// DEMO CALIBRATION DATA generator (spec §23-24).
//
// Produces a synthetic dataset of "controlled exposure" samples by running
// the demo calibration model forward (dose -> expected ΔE) and adding
// plausible measurement noise, plus fabricated but self-consistent Lab
// values and environment metadata. This is explicitly NOT laboratory data —
// every record is flagged isDemo=true and the UI must always show
// "DEMO CALIBRATION DATA" alongside it (never presented as real results).
// ============================================================================

import type { CalibrationSample } from '../types';
import { DEMO_CALIBRATION_PARAMS } from '../services/calibrationModel';
import { PRISTINE_SILVER_LAB } from './constants';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoCalibrationSamples(count = 24): CalibrationSample[] {
  const rand = mulberry32(20260101);
  const { deltaEMax, d50 } = DEMO_CALIBRATION_PARAMS;
  const samples: CalibrationSample[] = [];
  const batches = ['AG-BATCH-01', 'AG-BATCH-02', 'AG-BATCH-03'];
  const devices = ['Pixel-7-Camera', 'Redmi-Note-12-Camera', 'iPhone-13-Camera'];

  for (let i = 0; i < count; i++) {
    const dose = Math.round((i / (count - 1)) * 1600 + rand() * 40);
    const trueDeltaE = deltaEMax * (1 - Math.exp(-dose / d50));
    const noisyDeltaE = Math.max(0, trueDeltaE + (rand() - 0.5) * deltaEMax * 0.06);

    // Fabricate a self-consistent Lab reading: shift baseline toward the
    // "converted" direction proportionally to noisyDeltaE.
    const t = Math.min(1, noisyDeltaE / deltaEMax);
    const L = PRISTINE_SILVER_LAB.L - t * 55 + (rand() - 0.5) * 2;
    const a = PRISTINE_SILVER_LAB.a + t * 4 + (rand() - 0.5) * 1.5;
    const b = PRISTINE_SILVER_LAB.b + t * 18 + (rand() - 0.5) * 2;

    const concentration = Math.max(1, Math.round(5 + rand() * 45));
    const duration = Math.max(1, Math.round(dose / concentration));

    samples.push({
      id: `CAL-DEMO-${String(i + 1).padStart(3, '0')}`,
      knownConcentrationPpm: concentration,
      exposureDurationHours: duration,
      doseKnown: concentration * duration,
      lab: { L, a, b },
      deltaL: L - PRISTINE_SILVER_LAB.L,
      deltaA: a - PRISTINE_SILVER_LAB.a,
      deltaB: b - PRISTINE_SILVER_LAB.b,
      deltaE2000: Math.round(noisyDeltaE * 100) / 100,
      temperatureC: Math.round((24 + (rand() - 0.5) * 6) * 10) / 10,
      humidityPct: Math.round(45 + (rand() - 0.5) * 20),
      stripBatch: batches[i % batches.length],
      device: devices[i % devices.length],
      isDemo: true,
      createdAt: Date.now() - (count - i) * 86_400_000,
    });
  }

  return samples;
}
