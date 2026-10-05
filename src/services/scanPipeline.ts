// ============================================================================
// Scan pipeline orchestration.
//
// Single entry point the UI calls with a captured/uploaded/demo canvas frame
// plus the guide box it was aligned to. Runs the real region detection,
// image-quality validation, reference correction, ΔE2000, calibration and
// integrity steps in order, gating each downstream step exactly as spec
// §10/§11 require (bad image => no dose; expired badge => no dose).
// ============================================================================

import type { AlignmentMethod, CaptureMethod, DemoPresetId, DetectedRegion, Measurement, RejectionCode } from '../types';
import type { GuideBox } from './imageProcessing/regionSampling';
import { detectRegionsByLayout, detectRegionsManual } from './imageProcessing/regionSampling';
import { assessImageQuality } from './imageProcessing/imageQuality';
import { buildColorFeatures } from './imageProcessing/colorCorrection';
import { classifyExpiry } from './imageProcessing/expiryDetection';
import { computeMeasurementIntegrity } from './measurementIntegrity';
import { estimateDose, getActiveModel } from './calibrationModel';
import { CURRENT_MODEL_VERSION } from '../data/constants';

export interface ManualRoi {
  sensing: DetectedRegion;
  reference: DetectedRegion;
  expiry: DetectedRegion;
}

/** Result of the QR/manual wristband identity check, run before the optical
 *  scan (spec §1/§2). Absent (undefined) means "not gated" — used by legacy
 *  callers/tests that don't go through the QR step. */
export interface WristbandGate {
  ok: boolean;
  code?: RejectionCode;
  message?: string;
}

export interface ScanContext {
  workerId: string | null;
  shiftId: string | null;
  wristbandId: string | null;
  isDemo: boolean;
  demoPresetId: DemoPresetId | null;
  wristbandGate?: WristbandGate;
  captureMethod?: CaptureMethod;
  alignmentMethod?: AlignmentMethod;
  wristbandQrVerified?: boolean;
}

const ISSUE_TO_REJECTION_CODE: Record<string, RejectionCode> = {
  blur: 'IMAGE_BLUR',
  too_dark: 'IMAGE_TOO_DARK',
  too_bright: 'IMAGE_TOO_BRIGHT',
  glare: 'IMAGE_GLARE',
  clipping: 'IMAGE_CLIPPED',
  framing: 'INVALID_FRAME',
  low_region_confidence: 'INVALID_FRAME',
  reference_not_visible: 'REFERENCE_MISSING',
  sensing_not_visible: 'SENSING_REGION_INVALID',
  expiry_not_visible: 'EXPIRY_UNREADABLE',
};

function makeThumbnail(canvas: HTMLCanvasElement, maxDim = 320): string {
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));
  const thumb = document.createElement('canvas');
  thumb.width = w;
  thumb.height = h;
  const ctx = thumb.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(canvas, 0, 0, w, h);
  return thumb.toDataURL('image/jpeg', 0.7);
}

/** Snap a (possibly fractional, possibly overhanging) guide box to whole pixels inside the frame. */
function normaliseGuideBox(box: GuideBox, frameW: number, frameH: number): GuideBox {
  const x = Math.max(0, Math.min(frameW - 2, Math.round(box.x)));
  const y = Math.max(0, Math.min(frameH - 2, Math.round(box.y)));
  return {
    x,
    y,
    width: Math.max(2, Math.min(frameW - x, Math.round(box.width))),
    height: Math.max(2, Math.min(frameH - y, Math.round(box.height))),
  };
}

export function runScanPipeline(
  frame: HTMLCanvasElement,
  rawGuideBox: GuideBox,
  ctx: ScanContext,
  manualRoi?: ManualRoi
): Measurement {
  const guideBox = normaliseGuideBox(rawGuideBox, frame.width, frame.height);
  const canvasCtx = frame.getContext('2d', { willReadFrequently: true });
  const imageData = canvasCtx
    ? canvasCtx.getImageData(0, 0, frame.width, frame.height)
    : new ImageData(1, 1);

  const { detection, samples } = manualRoi
    ? detectRegionsManual(imageData, manualRoi)
    : detectRegionsByLayout(imageData, guideBox);

  const regionLabs = {
    sensingLab: samples.sensing.lab,
    referenceLab: samples.reference.lab,
    expiryLab: samples.expiry.lab,
  };
  const imageQuality = assessImageQuality(imageData, guideBox, detection, regionLabs);
  const expiry = classifyExpiry(samples.expiry);
  const thumbnailDataUrl = makeThumbnail(frame);

  // Bug fix (spec §5B): the active calibration model's own
  // params.isSimulated is the single source of truth — never a hardcoded
  // `true` baked into this pipeline. Today's demo model reports true; a
  // future lab model can report false without any change here.
  const activeModel = getActiveModel();
  const modelIsSimulated = activeModel.params.isSimulated;

  const base: Measurement = {
    id: `MEAS-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
    workerId: ctx.workerId,
    shiftId: ctx.shiftId,
    wristbandId: ctx.wristbandId,
    timestamp: Date.now(),
    status: 'accepted',
    rejectionReason: null,
    rejectionCode: null,
    imageQuality,
    regionDetection: detection,
    expiry,
    colorFeatures: null,
    dose: null,
    integrity: null,
    calibrationModelVersion: activeModel.params.version ?? CURRENT_MODEL_VERSION,
    isSimulated: modelIsSimulated,
    isDemo: ctx.isDemo,
    demoPresetId: ctx.demoPresetId,
    captureMethod: ctx.captureMethod,
    alignmentMethod: ctx.alignmentMethod,
    imageWidth: frame.width,
    imageHeight: frame.height,
    wristbandQrVerified: ctx.wristbandQrVerified ?? false,
    thumbnailDataUrl,
  };

  // Wristband identity gate (spec §1/§2) — checked before any quantitative
  // result is produced. A failed gate here never consumes the wristband;
  // single-use consumption only ever happens after a committed save.
  if (ctx.wristbandGate && !ctx.wristbandGate.ok) {
    return {
      ...base,
      status: 'rejected',
      rejectionReason: ctx.wristbandGate.message ?? 'Wristband could not be verified.',
      rejectionCode: ctx.wristbandGate.code ?? 'INVALID_WRISTBAND',
    };
  }

  if (!imageQuality.passed) {
    const firstReject = imageQuality.issues.find((i) => i.severity === 'reject');
    return {
      ...base,
      status: 'rejected',
      rejectionReason: firstReject?.message ?? 'Measurement rejected: image quality checks failed.',
      rejectionCode: (firstReject && ISSUE_TO_REJECTION_CODE[firstReject.code]) ?? 'INVALID_FRAME',
    };
  }

  if (expiry.status === 'expired') {
    return {
      ...base,
      status: 'expired_badge',
      rejectionReason: 'Badge expired. Quantitative measurement unavailable.',
      rejectionCode: 'BADGE_EXPIRED',
    };
  }

  // Bug fix (spec §5A): an unreadable expiry indicator must never silently
  // proceed to dose calculation — only VALID/EXPIRING_SOON continue.
  if (expiry.status === 'unreadable') {
    return {
      ...base,
      status: 'rejected',
      rejectionReason: 'Expiry indicator could not be verified. Retake the scan with the expiry indicator clearly visible.',
      rejectionCode: 'EXPIRY_UNREADABLE',
    };
  }

  const colorFeatures = buildColorFeatures(samples.sensing, samples.reference);
  const integrity = computeMeasurementIntegrity(imageQuality, detection, expiry, modelIsSimulated);
  const dose = estimateDose(colorFeatures, integrity.score);

  return {
    ...base,
    status: 'accepted',
    colorFeatures,
    integrity,
    dose,
  };
}
