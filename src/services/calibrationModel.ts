// ============================================================================
// Dose calibration model
//
// This is the ONE place in the whole codebase that turns a colour change
// into a dose number. Everything upstream (image capture, region detection,
// Lab conversion, ΔE2000) is real measurement code. Everything downstream
// of this file (UI, storage, export) just carries the numbers this file
// produces.
//
// The model implemented here — an exponential-saturation curve
//   ΔE(dose) = ΔEmax * (1 - exp(-dose / D50))
// — is SIMULATED. Its parameters (deltaEMax, d50) are illustrative, chosen
// so the demo behaves sensibly, not measured from a controlled H2S chamber.
//
// Swap-out contract: a future lab-derived model only needs to implement
// `CalibrationModel` (below) and be registered in `getActiveModel()`. No
// other file needs to change. A lab model would likely replace the closed-
// form inverse with a lookup/regression fit to CalibrationSample data
// (see services/storage — calibration samples are already collected).
// ============================================================================

import type { CalibrationModelParams, ColorFeatures, DoseEstimate, ExposureCategory } from '../types';
import { CURRENT_MODEL_VERSION, DELTA_E_MAX_ESTIMATE, DEMO_EXPOSURE_THRESHOLDS } from '../data/constants';

export interface CalibrationModel {
  params: CalibrationModelParams;
  /** dose (ppm·h) -> expected ΔE2000, the forward physical model. */
  forward(dose: number): number;
  /** ΔE2000 -> dose estimate with an uncertainty band, the inverse used at read time. */
  invert(deltaE: number, measurementIntegrity01: number): {
    dose: number;
    lower: number;
    upper: number;
  };
}

export const DEMO_CALIBRATION_PARAMS: CalibrationModelParams = {
  version: CURRENT_MODEL_VERSION,
  isSimulated: true,
  deltaEMax: Number((DELTA_E_MAX_ESTIMATE * 0.92).toFixed(2)), // stay just under the visual endpoint
  d50: 420, // ppm·h — arbitrary demo midpoint
  baseUncertaintyFraction: 0.12, // +/-12% at perfect measurement integrity
  createdAt: Date.UTC(2026, 0, 1),
  notes:
    'Exponential-saturation placeholder model. Parameters are illustrative only and ' +
    'must be replaced with a regression fit to controlled H2S chamber data before any ' +
    'real occupational-exposure decision is made from this app.',
};

class ExponentialSaturationModel implements CalibrationModel {
  params: CalibrationModelParams;

  constructor(params: CalibrationModelParams) {
    this.params = params;
  }

  forward(dose: number): number {
    const { deltaEMax, d50 } = this.params;
    return deltaEMax * (1 - Math.exp(-dose / d50));
  }

  invert(deltaE: number, measurementIntegrity01: number) {
    const { deltaEMax, d50, baseUncertaintyFraction } = this.params;
    // Guard the log() domain: ΔE can't exceed ΔEmax in this model.
    const clamped = Math.min(Math.max(deltaE, 0), deltaEMax * 0.995);
    const dose = -d50 * Math.log(1 - clamped / deltaEMax);

    // Uncertainty widens as measurement integrity drops. This is a
    // deliberately simple heuristic (linear scaling of a base band), not a
    // propagated-error calculation from a real noise model — that requires
    // lab-characterised camera/lighting noise statistics.
    const integrityPenalty = 1 + (1 - measurementIntegrity01) * 1.8;
    const band = dose * baseUncertaintyFraction * integrityPenalty;

    return {
      dose: Math.max(0, dose),
      lower: Math.max(0, dose - band),
      upper: dose + band,
    };
  }
}

let activeModel: CalibrationModel = new ExponentialSaturationModel(DEMO_CALIBRATION_PARAMS);

/** Returns the currently active calibration model (demo, or a future lab model). */
export function getActiveModel(): CalibrationModel {
  return activeModel;
}

/** Swap-in point for a future experimentally-derived model. */
export function setActiveModel(model: CalibrationModel): void {
  activeModel = model;
}

function classify(dose: number, confidenceScore: number): ExposureCategory {
  if (confidenceScore < 0.35) return 'review_required';
  if (dose <= DEMO_EXPOSURE_THRESHOLDS.lowMax) return 'low';
  if (dose <= DEMO_EXPOSURE_THRESHOLDS.moderateMax) return 'moderate';
  return 'high';
}

function confidenceLabelFromScore(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score >= 0.7) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
}

/**
 * Turns extracted colour features + a measurement-integrity score into a
 * full dose estimate. This is the function the Scan pipeline calls.
 */
export function estimateDose(
  colorFeatures: ColorFeatures,
  measurementIntegrityScore: number // 0-100
): DoseEstimate {
  const model = getActiveModel();
  const integrity01 = Math.min(1, Math.max(0, measurementIntegrityScore / 100));
  const { dose, lower, upper } = model.invert(colorFeatures.deltaE2000, integrity01);

  // Confidence combines measurement integrity with how "stretched" the
  // uncertainty band is. The band is normalised against a floor of
  // d50*0.1 rather than the raw dose so that near-zero (clean/unexposed)
  // readings — where the ΔE signal is small but genuinely close to zero,
  // not noisy — don't get penalised by a ratio blowing up near zero.
  const scale = Math.max(dose, model.params.d50 * 0.1);
  const relativeBand = (upper - lower) / (2 * scale);
  const confidenceScore = Math.max(0, Math.min(1, integrity01 * (1 - Math.min(relativeBand, 1) * 0.6)));

  return {
    doseEstimate: Math.round(dose) || 0,
    lowerBound: Math.round(lower) || 0,
    upperBound: Math.round(upper) || 0,
    confidenceLabel: confidenceLabelFromScore(confidenceScore),
    confidenceScore,
    category: classify(dose, confidenceScore),
    modelVersion: model.params.version,
    // Sourced from the active model, not hardcoded (spec §5B) — the demo
    // model's params.isSimulated is true; a future lab model's would be false.
    isSimulated: model.params.isSimulated,
  };
}
