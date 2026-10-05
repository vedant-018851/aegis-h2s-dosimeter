// ============================================================================
// Aegis H2S — core domain types
//
// These interfaces are the contract between the UI, the processing pipeline
// and the storage layer. Keeping them in one place is what lets the
// simulated calibration model (see services/calibrationModel.ts) be swapped
// for a lab-derived model later without touching UI code, and lets
// StorageService be swapped from IndexedDB to a remote backend without
// touching the pipeline.
// ============================================================================

/** A worker enrolled in the exposure-monitoring programme. */
export interface Worker {
  id: string; // e.g. "W-001"
  name: string;
  role: string;
  department: string;
  wristbandId: string | null;
  isDemo: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ShiftStatus = 'active' | 'ended';

export interface Shift {
  id: string;
  workerId: string;
  wristbandId: string;
  label: string; // "Morning", "Night", ...
  startedAt: number;
  endedAt: number | null;
  status: ShiftStatus;
  isDemo: boolean;
}

export type WristbandStatus = 'available' | 'assigned' | 'expired' | 'retired';

export interface Wristband {
  id: string; // e.g. "WB-0241"
  status: WristbandStatus;
  manufacturedAt: number;
  expiresAt: number;
  batch: string;
  assignedWorkerId: string | null;
  isDemo: boolean;
  /**
   * Single-use enforcement (spec §2). Set only once a measurement using this
   * wristband is successfully committed to storage — never on scan/QR read
   * alone. `null`/`undefined` (older records) means "not yet used". Kept as
   * a separate timestamp rather than a new WristbandStatus value so the
   * existing available/assigned/expired/retired lifecycle is untouched;
   * `wristbandLifecycle()` derives the "used" state from this field.
   */
  usedAt?: number | null;
  /** The measurement that consumed this wristband, for traceability. */
  usedByMeasurementId?: string | null;
}

// ----------------------------------------------------------------------------
// Colour science
// ----------------------------------------------------------------------------

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

/** Colour features extracted for one region of the captured frame. */
export interface RegionColorSample {
  meanRgb: RGB;
  stdDevRgb: RGB; // used as a within-region uniformity / confidence signal
  lab: LabColor;
  sampledPixels: number;
}

export interface ColorFeatures {
  sensingRaw: RegionColorSample;
  referenceRaw: RegionColorSample;
  /** Sensing-patch colour after reference-based lighting correction. */
  sensingCorrected: LabColor;
  /** Correction actually applied (per-channel Lab shift), for transparency. */
  correctionApplied: { dL: number; da: number; db: number };
  /** Baseline (unexposed Ag) reference the sensing patch is compared against. */
  baselineLab: LabColor;
  deltaL: number;
  deltaA: number;
  deltaB: number;
  deltaE2000: number;
}

// ----------------------------------------------------------------------------
// Image quality
// ----------------------------------------------------------------------------

export type ImageQualityIssueCode =
  | 'blur'
  | 'too_dark'
  | 'too_bright'
  | 'glare'
  | 'clipping'
  | 'reference_not_visible'
  | 'sensing_not_visible'
  | 'expiry_not_visible'
  | 'framing'
  | 'low_region_confidence';

export interface ImageQualityIssue {
  code: ImageQualityIssueCode;
  message: string;
  severity: 'reject' | 'warn';
}

export interface ImageQualityResult {
  passed: boolean;
  score: number; // 0-100
  sharpness: number; // Laplacian-variance based, arbitrary units
  brightness: number; // mean luminance 0-255
  glareRatio: number; // fraction of near-white clipped pixels
  clippingRatio: number; // fraction of near-black + near-white pixels
  framingRatio: number; // fraction of guide box the detected band occupies
  issues: ImageQualityIssue[];
}

// ----------------------------------------------------------------------------
// Region / wristband detection
// ----------------------------------------------------------------------------

export interface DetectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number; // 0-1
}

export interface RegionDetectionResult {
  sensing: DetectedRegion | null;
  reference: DetectedRegion | null;
  expiry: DetectedRegion | null;
  overallConfidence: number;
  method: 'layout-proportion' | 'manual-roi';
}

// ----------------------------------------------------------------------------
// Expiry
// ----------------------------------------------------------------------------

export type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'unreadable';

export interface ExpiryResult {
  status: ExpiryStatus;
  confidence: number;
}

// ----------------------------------------------------------------------------
// Calibration model + dose estimation
// ----------------------------------------------------------------------------

/** Parameters of the modular exponential-saturation calibration model. */
export interface CalibrationModelParams {
  version: string; // e.g. "CAL-v0.1-DEMO"
  isSimulated: boolean;
  deltaEMax: number; // asymptotic ΔE2000 at "fully converted" Ag2S
  d50: number; // dose (ppm·h) at which ΔE reaches ~63% of deltaEMax
  /** Multiplicative uncertainty band half-width, scaled by measurement integrity. */
  baseUncertaintyFraction: number;
  createdAt: number;
  notes: string;
}

export type ExposureCategory = 'low' | 'moderate' | 'high' | 'review_required';

export interface DoseEstimate {
  doseEstimate: number; // ppm·h
  lowerBound: number;
  upperBound: number;
  confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number; // 0-1
  category: ExposureCategory;
  modelVersion: string;
  /**
   * Sourced from the active CalibrationModel's params.isSimulated (spec §5B)
   * — no longer a hardcoded literal `true`, so a future non-simulated lab
   * model can report `false` here without any pipeline changes.
   */
  isSimulated: boolean;
}

// ----------------------------------------------------------------------------
// Measurement integrity
// ----------------------------------------------------------------------------

export interface IntegrityBreakdown {
  imageQuality: number; // 0-100 contribution
  referenceQuality: number;
  regionQuality: number;
  badgeValidity: number;
  calibrationApplicability: number;
}

export interface MeasurementIntegrity {
  score: number; // 0-100, weighted combination
  breakdown: IntegrityBreakdown;
}

// ----------------------------------------------------------------------------
// Structured rejection codes (spec §6) — internal machine-readable codes
// alongside the existing human-readable messages. Only codes with an actual
// implemented detection path are used; see scanPipeline.ts / qrWristband.ts
// / arucoAlignment.ts for where each is raised.
// ----------------------------------------------------------------------------

export type RejectionCode =
  | 'IMAGE_BLUR'
  | 'IMAGE_TOO_DARK'
  | 'IMAGE_TOO_BRIGHT'
  | 'IMAGE_GLARE'
  | 'IMAGE_CLIPPED'
  | 'INVALID_FRAME'
  | 'REFERENCE_MISSING'
  | 'REFERENCE_LOW_CONFIDENCE'
  | 'SENSING_REGION_INVALID'
  | 'EXPIRY_UNREADABLE'
  | 'BADGE_EXPIRED'
  | 'INVALID_WRISTBAND'
  | 'WRISTBAND_ALREADY_USED'
  | 'CALIBRATION_UNAVAILABLE'
  | 'ALIGNMENT_FAILED';

// ----------------------------------------------------------------------------
// Capture / alignment traceability (spec §7)
// ----------------------------------------------------------------------------

export type CaptureMethod = 'camera' | 'upload' | 'demo';
export type AlignmentMethod = 'aruco' | 'manual' | 'demo';

// ----------------------------------------------------------------------------
// Measurement record (what actually gets saved)
// ----------------------------------------------------------------------------

export type MeasurementStatus = 'accepted' | 'rejected' | 'expired_badge';

export interface Measurement {
  id: string;
  workerId: string | null;
  shiftId: string | null;
  wristbandId: string | null;
  timestamp: number;
  status: MeasurementStatus;
  rejectionReason: string | null;
  /** Structured counterpart of rejectionReason — internal, machine-readable. */
  rejectionCode: RejectionCode | null;

  imageQuality: ImageQualityResult;
  regionDetection: RegionDetectionResult;
  expiry: ExpiryResult;
  colorFeatures: ColorFeatures | null;
  dose: DoseEstimate | null;
  integrity: MeasurementIntegrity | null;

  calibrationModelVersion: string;
  isSimulated: boolean;
  isDemo: boolean;
  demoPresetId: string | null;

  /** How the source frame was obtained. Optional for backward compatibility with older records. */
  captureMethod?: CaptureMethod;
  /** Whether the frame was aligned via automatic ArUco detection, manual guide-box, or demo synthesis. */
  alignmentMethod?: AlignmentMethod;
  imageWidth?: number;
  imageHeight?: number;
  /** True once the wristband identity behind this measurement was confirmed via QR (vs. manual/demo). */
  wristbandQrVerified?: boolean;

  /** Small JPEG data-URL thumbnail of the captured frame, for the history view. */
  thumbnailDataUrl: string | null;
}

// ----------------------------------------------------------------------------
// Calibration lab samples (admin section)
// ----------------------------------------------------------------------------

export interface CalibrationSample {
  id: string;
  knownConcentrationPpm: number;
  exposureDurationHours: number;
  doseKnown: number; // ppm·h, = concentration * duration for a controlled sample
  lab: LabColor;
  deltaL: number;
  deltaA: number;
  deltaB: number;
  deltaE2000: number;
  temperatureC: number;
  humidityPct: number;
  stripBatch: string;
  device: string;
  isDemo: boolean;
  createdAt: number;
}

export interface ModelMetadata {
  version: string;
  isSimulated: boolean;
  params: CalibrationModelParams;
  activatedAt: number;
}

// ----------------------------------------------------------------------------
// Demo mode
// ----------------------------------------------------------------------------

export type DemoPresetId =
  | 'clean_unexposed'
  | 'low_exposure'
  | 'moderate_exposure'
  | 'high_exposure'
  | 'expired_badge'
  | 'blurry_scan'
  | 'excessive_glare'
  | 'poor_lighting'
  | 'missing_reference'
  | 'invalid_wristband';

export interface DemoPreset {
  id: DemoPresetId;
  label: string;
  description: string;
  category: 'exposure' | 'failure';
}

// ----------------------------------------------------------------------------
// Export
// ----------------------------------------------------------------------------

export interface ExportRow {
  workerId: string;
  shiftId: string;
  wristbandId: string;
  timestamp: string;
  dose: number | '';
  lowerRange: number | '';
  upperRange: number | '';
  confidence: string;
  badgeValidity: ExpiryStatus | '';
  imageQuality: number;
  calibrationVersion: string;
  simulationFlag: boolean;
  captureMethod: CaptureMethod | '';
  alignmentMethod: AlignmentMethod | '';
  rejectionCode: RejectionCode | '';
}
