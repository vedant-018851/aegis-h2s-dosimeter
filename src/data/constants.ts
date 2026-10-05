// ============================================================================
// Reference constants for the colour pipeline.
//
// These are *placeholder engineering estimates*, not measured values. They
// stand in for numbers that must eventually come from a spectrophotometer
// reading of an actual fresh Ag strip and an actual printed neutral
// reference patch. Nothing about the surrounding math is fake — only these
// two starting colours are assumptions.
// ============================================================================

import type { LabColor, RGB } from '../types';
import { rgbToLab } from '../services/colorScience';

/** Approximate sRGB of a fresh, unoxidised silver foil strip under neutral light. */
export const PRISTINE_SILVER_RGB: RGB = { r: 210, g: 210, b: 205 };
export const PRISTINE_SILVER_LAB: LabColor = rgbToLab(PRISTINE_SILVER_RGB);

/** Approximate sRGB of fully-converted Ag2S (near-black tarnish) — used only
 *  to bound the model's ΔEmax and to render demo "high exposure" previews. */
export const FULLY_CONVERTED_RGB: RGB = { r: 35, g: 32, b: 30 };
export const FULLY_CONVERTED_LAB: LabColor = rgbToLab(FULLY_CONVERTED_RGB);

/** Expected sRGB of the printed fixed neutral reference patch (18%-grey card equivalent). */
export const EXPECTED_REFERENCE_RGB: RGB = { r: 128, g: 128, b: 128 };
export const EXPECTED_REFERENCE_LAB: LabColor = rgbToLab(EXPECTED_REFERENCE_RGB);

export const DELTA_E_MAX_ESTIMATE = (() => {
  // Rough upper bound on colour travel used to seed the demo calibration
  // model — see services/calibrationModel.ts for how this is used.
  const dl = FULLY_CONVERTED_LAB.L - PRISTINE_SILVER_LAB.L;
  const da = FULLY_CONVERTED_LAB.a - PRISTINE_SILVER_LAB.a;
  const db = FULLY_CONVERTED_LAB.b - PRISTINE_SILVER_LAB.b;
  return Math.sqrt(dl * dl + da * da + db * db);
})();

/** Demo-only exposure category thresholds. NOT regulatory limits. */
export const DEMO_EXPOSURE_THRESHOLDS = {
  lowMax: 400, // ppm·h
  moderateMax: 900,
  // above moderateMax => 'high'; wide uncertainty bands => 'review_required'
};

export const DEMO_DISCLAIMER = 'DEMO THRESHOLDS — NOT REGULATORY VALUES';
export const SIMULATED_RESULT_LABEL = 'SIMULATED RESULT — LAB CALIBRATION PENDING';
export const DEMO_CALIBRATION_LABEL = 'DEMO CALIBRATION DATA';
export const INTEGRITY_LABEL = 'PROTOTYPE MEASUREMENT-QUALITY INDICATOR';
export const LOCAL_DATA_NOTICE = 'Data stored locally on this device.';

export const CURRENT_MODEL_VERSION = 'CAL-v0.1-DEMO';

// ----------------------------------------------------------------------------
// Branding + terminology constants (SIH 2026 · Team Kaizen). Centralised here
// so every page uses identical wording — see spec section 16.
// ----------------------------------------------------------------------------
export const APP_NAME = 'Aegis H₂S';
export const APP_TAGLINE = 'Passive H₂S Exposure-Dosimeter Wristband';
export const TEAM_NAME = 'Team Kaizen';
export const PROBLEM_STATEMENT = 'SIH 2026 · PS 26118';

/** Shown on the dose-result screen: this number is a prototype estimate, not a lab-validated reading. */
export const PROTOTYPE_ESTIMATE_LABEL = 'PROTOTYPE ESTIMATE';
export const CALIBRATION_STATUS_LABEL = 'Simulated calibration \u2022 Laboratory validation pending';
export const NOT_AN_ALARM_LABEL = 'Not a certified real-time H\u2082S alarm';

/** Core safety boundary — spec section 9. Shown on Science, Settings/About and the result screen. */
export const SAFETY_DISCLAIMER =
  'Aegis H\u2082S is a passive exposure-recording prototype. It is not a certified real-time H\u2082S alarm, ' +
  'medical device, or replacement for PPE, site SOPs or certified safety monitoring.';
export const SAFETY_COMPLEMENT_NOTE = 'Complements \u2014 not replaces \u2014 certified H\u2082S alarms, PPE and site SOPs.';

/** Environmental compensation is captured (temperature/RH fields on each calibration sample) but not
 *  yet applied to the dose model — spec section 4. Do not imply it is already validated. */
export const TEMP_RH_PLANNED_NOTE = 'Temperature/RH compensation planned for multi-condition calibration.';

/** Physical product spec terms — spec section 10. Illustrative target, not an experimentally certified value. */
export const CLASP_RELEASE_FORCE_NOTE = 'Breakaway clasp — target release force: 3\u20135 kgf (not yet mechanically certified).';

/** Band identification — spec section 11. QR verification is implemented for Safety Officers only;
 *  optical wristband measurement remains a separate Supervisor/Worker workflow. */
export const BAND_ID_PRIVACY_NOTE =
  'The band ID (QR-ready) is for identification and traceability only \u2014 it should never encode worker ' +
  'personal information.';
