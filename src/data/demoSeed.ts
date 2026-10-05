// ============================================================================
// First-run demo seed data (spec §7, §34).
//
// Populates a handful of clearly-synthetic workers, wristbands, an active
// shift, and a short measurement history so the Dashboard / History /
// Worker Detail screens aren't empty the first time the app is opened.
// Every seeded record is flagged isDemo=true.
// ============================================================================

import type { Measurement, Shift, Worker, Wristband } from '../types';
import { CURRENT_MODEL_VERSION } from './constants';

const DAY = 86_400_000;
const now = Date.now();

export const DEMO_WORKERS: Worker[] = [
  {
    id: 'W-001',
    name: 'Demo Worker',
    role: 'Process Technician',
    department: 'Operations',
    wristbandId: 'WB-001',
    isDemo: true,
    createdAt: now - 30 * DAY,
    updatedAt: now - 1 * DAY,
  },
  {
    id: 'W-002',
    name: 'Rahul Sharma',
    role: 'Process Technician',
    department: 'Effluent Treatment',
    wristbandId: 'WB-0241',
    isDemo: true,
    createdAt: now - 26 * DAY,
    updatedAt: now,
  },
  {
    id: 'W-003',
    name: 'Priya Verma',
    role: 'Shift Supervisor',
    department: 'Operations',
    wristbandId: 'WB-0117',
    isDemo: true,
    createdAt: now - 20 * DAY,
    updatedAt: now - 2 * DAY,
  },
  {
    id: 'W-004',
    name: 'Sanjay Iyer',
    role: 'Maintenance Technician',
    department: 'Utilities',
    wristbandId: null,
    isDemo: true,
    createdAt: now - 12 * DAY,
    updatedAt: now - 12 * DAY,
  },
];

export const DEMO_WRISTBANDS: Wristband[] = [
  {
    id: 'WB-001',
    status: 'assigned',
    manufacturedAt: now - 40 * DAY,
    expiresAt: now + 50 * DAY,
    batch: 'AG-BATCH-02',
    assignedWorkerId: 'W-001',
    isDemo: true,
  },
  {
    id: 'WB-0241',
    status: 'assigned',
    manufacturedAt: now - 35 * DAY,
    expiresAt: now + 55 * DAY,
    batch: 'AG-BATCH-02',
    assignedWorkerId: 'W-002',
    isDemo: true,
  },
  {
    id: 'WB-0117',
    status: 'assigned',
    manufacturedAt: now - 22 * DAY,
    expiresAt: now + 68 * DAY,
    batch: 'AG-BATCH-03',
    assignedWorkerId: 'W-003',
    isDemo: true,
  },
  {
    id: 'WB-0092',
    status: 'expired',
    manufacturedAt: now - 120 * DAY,
    expiresAt: now - 30 * DAY,
    batch: 'AG-BATCH-01',
    assignedWorkerId: null,
    isDemo: true,
  },
];

export const DEMO_SHIFTS: Shift[] = [
  {
    id: 'SHIFT-DEMO-001',
    workerId: 'W-002',
    wristbandId: 'WB-0241',
    label: 'Morning',
    startedAt: now - 3 * 60 * 60 * 1000,
    endedAt: null,
    status: 'active',
    isDemo: true,
  },
  {
    id: 'SHIFT-DEMO-002',
    workerId: 'W-001',
    wristbandId: 'WB-001',
    label: 'Morning',
    startedAt: now - 5 * 60 * 60 * 1000,
    endedAt: null,
    status: 'active',
    isDemo: true,
  },
];

function seededMeasurement(
  id: string,
  workerId: string,
  wristbandId: string,
  daysAgo: number,
  dose: number,
  confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH',
  confidenceScore: number,
  integrityScore: number
): Measurement {
  const band = dose * 0.14 * (1 + (1 - confidenceScore));
  return {
    id,
    workerId,
    shiftId: null,
    wristbandId,
    timestamp: now - daysAgo * DAY,
    status: 'accepted',
    rejectionReason: null,
    rejectionCode: null,
    captureMethod: 'demo',
    alignmentMethod: 'demo',
    imageWidth: 960,
    imageHeight: 720,
    wristbandQrVerified: false,
    imageQuality: {
      passed: true,
      score: integrityScore,
      sharpness: 140,
      brightness: 150,
      glareRatio: 0.01,
      clippingRatio: 0.02,
      framingRatio: 0.95,
      issues: [],
    },
    regionDetection: {
      sensing: { x: 0, y: 0, width: 0, height: 0, confidence: 0.9 },
      reference: { x: 0, y: 0, width: 0, height: 0, confidence: 0.92 },
      expiry: { x: 0, y: 0, width: 0, height: 0, confidence: 0.88 },
      overallConfidence: 0.9,
      method: 'layout-proportion',
    },
    expiry: { status: 'valid', confidence: 0.9 },
    colorFeatures: null,
    dose: {
      doseEstimate: Math.round(dose),
      lowerBound: Math.round(Math.max(0, dose - band)),
      upperBound: Math.round(dose + band),
      confidenceLabel,
      confidenceScore,
      category: dose <= 400 ? 'low' : dose <= 900 ? 'moderate' : 'high',
      modelVersion: CURRENT_MODEL_VERSION,
      isSimulated: true,
    },
    integrity: {
      score: integrityScore,
      breakdown: {
        imageQuality: integrityScore,
        referenceQuality: 90,
        regionQuality: 88,
        badgeValidity: 100,
        calibrationApplicability: 55,
      },
    },
    calibrationModelVersion: CURRENT_MODEL_VERSION,
    isSimulated: true,
    isDemo: true,
    demoPresetId: null,
    thumbnailDataUrl: null,
  };
}

export const DEMO_MEASUREMENTS: Measurement[] = [
  seededMeasurement('MEAS-DEMO-001', 'W-002', 'WB-0241', 9, 180, 'HIGH', 0.82, 91),
  seededMeasurement('MEAS-DEMO-002', 'W-002', 'WB-0241', 7, 310, 'HIGH', 0.79, 90),
  seededMeasurement('MEAS-DEMO-003', 'W-002', 'WB-0241', 5, 460, 'MEDIUM', 0.61, 85),
  seededMeasurement('MEAS-DEMO-004', 'W-002', 'WB-0241', 3, 590, 'MEDIUM', 0.58, 84),
  seededMeasurement('MEAS-DEMO-005', 'W-002', 'WB-0241', 1, 742, 'MEDIUM', 0.55, 92),
  seededMeasurement('MEAS-DEMO-006', 'W-001', 'WB-001', 8, 90, 'HIGH', 0.85, 93),
  seededMeasurement('MEAS-DEMO-007', 'W-001', 'WB-001', 4, 140, 'HIGH', 0.8, 90),
  seededMeasurement('MEAS-DEMO-008', 'W-001', 'WB-001', 1, 205, 'HIGH', 0.77, 89),
  seededMeasurement('MEAS-DEMO-009', 'W-003', 'WB-0117', 6, 610, 'MEDIUM', 0.6, 87),
  seededMeasurement('MEAS-DEMO-010', 'W-003', 'WB-0117', 2, 830, 'MEDIUM', 0.52, 82),
];
