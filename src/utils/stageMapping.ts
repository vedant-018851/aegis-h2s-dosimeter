import type { ImageQualityIssueCode, Measurement } from '../types';

const ISSUE_STAGE: Record<ImageQualityIssueCode, number> = {
  low_region_confidence: 1,
  framing: 1,
  blur: 3,
  too_dark: 3,
  too_bright: 3,
  glare: 3,
  clipping: 3,
  sensing_not_visible: 4,
  reference_not_visible: 5,
  expiry_not_visible: 6,
};

/** Which of the 13 pipeline stages a saved/pending measurement failed at, or null if it succeeded. */
export function resolveFailStage(measurement: Measurement): number | null {
  if (measurement.status === 'accepted') return null;
  if (measurement.rejectionCode === 'INVALID_WRISTBAND' || measurement.rejectionCode === 'WRISTBAND_ALREADY_USED') {
    return 0; // wristband identity gate
  }
  if (measurement.status === 'expired_badge') return 2; // badge validity gate
  if (measurement.rejectionCode === 'EXPIRY_UNREADABLE') return 6;
  const firstReject = measurement.imageQuality.issues.find((i) => i.severity === 'reject');
  if (!firstReject) return 3;
  return ISSUE_STAGE[firstReject.code] ?? 3;
}
