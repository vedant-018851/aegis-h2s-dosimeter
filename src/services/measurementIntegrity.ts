// ============================================================================
// Measurement Integrity (spec §16)
//
// A prototype quality indicator, explicitly NOT a validated safety metric.
// It combines image quality, reference quality, ROI quality, badge validity
// and calibration applicability into one 0-100 score with a visible
// breakdown, so judges/users can see exactly what it is made of.
// ============================================================================

import type {
  ExpiryResult,
  ImageQualityResult,
  IntegrityBreakdown,
  MeasurementIntegrity,
  RegionDetectionResult,
} from '../types';

const WEIGHTS = {
  imageQuality: 0.3,
  referenceQuality: 0.2,
  regionQuality: 0.2,
  badgeValidity: 0.15,
  calibrationApplicability: 0.15,
};

export function computeMeasurementIntegrity(
  imageQuality: ImageQualityResult,
  regionDetection: RegionDetectionResult,
  expiry: ExpiryResult,
  isSimulatedModel: boolean
): MeasurementIntegrity {
  const referenceQuality = Math.round((regionDetection.reference?.confidence ?? 0) * 100);
  const regionQuality = Math.round(
    (((regionDetection.sensing?.confidence ?? 0) + (regionDetection.expiry?.confidence ?? 0)) / 2) * 100
  );

  const badgeValidity =
    expiry.status === 'valid'
      ? 100
      : expiry.status === 'expiring_soon'
        ? 70
        : expiry.status === 'unreadable'
          ? 40
          : 0;

  // A simulated calibration model can never be "fully applicable" to a
  // real-world dose decision — cap its contribution accordingly.
  const calibrationApplicability = isSimulatedModel ? 55 : 100;

  const breakdown: IntegrityBreakdown = {
    imageQuality: imageQuality.score,
    referenceQuality,
    regionQuality,
    badgeValidity,
    calibrationApplicability,
  };

  const score = Math.round(
    breakdown.imageQuality * WEIGHTS.imageQuality +
      breakdown.referenceQuality * WEIGHTS.referenceQuality +
      breakdown.regionQuality * WEIGHTS.regionQuality +
      breakdown.badgeValidity * WEIGHTS.badgeValidity +
      breakdown.calibrationApplicability * WEIGHTS.calibrationApplicability
  );

  return { score, breakdown };
}
