// ============================================================================
// Reference-based colour correction (spec §12)
//
// Uses the fixed neutral reference patch photographed alongside the sensing
// strip to estimate lighting/camera deviation, then applies that correction
// to the sensing-strip colour before computing ΔE2000 against the pristine
// baseline. This is an experimental correction mechanism — it narrows but
// does not eliminate lighting variability, and that limitation is surfaced
// in the UI's technical panel, not hidden.
// ============================================================================

import type { ColorFeatures, LabColor, RegionColorSample } from '../../types';
import { deltaE2000, labDelta, rgbToLab } from '../colorScience';
import { EXPECTED_REFERENCE_LAB, PRISTINE_SILVER_LAB } from '../../data/constants';

export function buildColorFeatures(
  sensingSample: RegionColorSample,
  referenceSample: RegionColorSample,
  baselineLab: LabColor = PRISTINE_SILVER_LAB,
  expectedReferenceLab: LabColor = EXPECTED_REFERENCE_LAB
): ColorFeatures {
  const measuredReferenceLab = referenceSample.lab;

  // Correction = (expected reference) - (measured reference), applied as a
  // simple additive Lab-space shift. This is a first-order lighting
  // correction; a full von-Kries or per-channel gain correction is a
  // reasonable future refinement once lab data shows which model fits best.
  const correction = {
    dL: expectedReferenceLab.L - measuredReferenceLab.L,
    da: expectedReferenceLab.a - measuredReferenceLab.a,
    db: expectedReferenceLab.b - measuredReferenceLab.b,
  };

  const sensingCorrected: LabColor = {
    L: sensingSample.lab.L + correction.dL,
    a: sensingSample.lab.a + correction.da,
    b: sensingSample.lab.b + correction.db,
  };

  const { deltaL, deltaA, deltaB } = labDelta(baselineLab, sensingCorrected);
  const dE = deltaE2000(baselineLab, sensingCorrected);

  return {
    sensingRaw: sensingSample,
    referenceRaw: referenceSample,
    sensingCorrected,
    correctionApplied: correction,
    baselineLab,
    deltaL,
    deltaA,
    deltaB,
    deltaE2000: dE,
  };
}

/** Re-exported for convenience where only a straight RGB->Lab is needed. */
export { rgbToLab };
