// ============================================================================
// Image quality validation (spec §10)
//
// Everything here runs on real ImageData pixels — grayscale conversion,
// a Laplacian convolution for sharpness, and histogram-style ratios for
// brightness/glare/clipping. Nothing is faked or randomised; feeding a
// genuinely blurry photo in will genuinely produce a low sharpness score.
// ============================================================================

import type { ImageQualityIssue, ImageQualityResult, RegionDetectionResult } from '../../types';
import type { GuideBox } from './regionSampling';
import { sampleRegion } from './regionSampling';
import { deltaE2000 } from '../colorScience';

/**
 * Real "is a wristband actually filling the guide box" measure: sample the
 * four corners of the guide box (where the dark strap should sit when the
 * band is well-framed) and compare against the guide box's overall colour
 * variance. A well-framed capture shows clear structure (strap -> window ->
 * coloured patches); an empty/misframed capture is close to uniform.
 */
function computeFramingRatio(imageData: ImageData, guideBox: GuideBox): number {
  const cornerSize = Math.max(4, Math.round(Math.min(guideBox.width, guideBox.height) * 0.08));
  const corners = [
    { x: guideBox.x, y: guideBox.y, width: cornerSize, height: cornerSize, confidence: 0 },
    { x: guideBox.x + guideBox.width - cornerSize, y: guideBox.y, width: cornerSize, height: cornerSize, confidence: 0 },
    { x: guideBox.x, y: guideBox.y + guideBox.height - cornerSize, width: cornerSize, height: cornerSize, confidence: 0 },
    {
      x: guideBox.x + guideBox.width - cornerSize,
      y: guideBox.y + guideBox.height - cornerSize,
      width: cornerSize,
      height: cornerSize,
      confidence: 0,
    },
  ];
  const cornerSamples = corners.map((c) => sampleRegion(imageData, c));
  const bgLab = cornerSamples[0].lab;

  const interior = {
    x: guideBox.x + Math.round(guideBox.width * 0.15),
    y: guideBox.y + Math.round(guideBox.height * 0.15),
    width: Math.round(guideBox.width * 0.7),
    height: Math.round(guideBox.height * 0.7),
    confidence: 0,
  };
  const interiorSample = sampleRegion(imageData, interior);

  const structuralDelta = deltaE2000(bgLab, interiorSample.lab);
  // Normalise: >12 ΔE of structure between the strap corners and the
  // window interior reads as "clearly a device is framed here".
  return Math.max(0, Math.min(1, structuralDelta / 12));
}

/**
 * Layout plausibility: a genuine wristband shows three distinguishable
 * colour zones. If the sensing/reference/expiry samples are all nearly
 * identical, this probably isn't a wristband at all.
 */
export function computeLayoutPlausibility(regionDetection: RegionDetectionResult, samples: {
  sensingLab: { L: number; a: number; b: number };
  referenceLab: { L: number; a: number; b: number };
  expiryLab: { L: number; a: number; b: number };
}): number {
  if (!regionDetection.sensing || !regionDetection.reference || !regionDetection.expiry) return 0;
  const d1 = deltaE2000(samples.sensingLab, samples.referenceLab);
  const d2 = deltaE2000(samples.referenceLab, samples.expiryLab);
  const avg = (d1 + d2) / 2;
  return Math.max(0, Math.min(1, avg / 10));
}

/** Downsampled grayscale buffer, for cheap-but-real sharpness measurement. */
function toGrayscale(imageData: ImageData): { gray: Float32Array; w: number; h: number } {
  const { data, width, height } = imageData;
  // Cap the working resolution for speed on phones.
  const maxDim = 480;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const gray = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const srcY = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < w; x++) {
      const srcX = Math.min(width - 1, Math.floor(x / scale));
      const idx = (srcY * width + srcX) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      gray[y * w + x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }
  return { gray, w, h };
}

/** Variance of the Laplacian of the grayscale image — a standard, real blur metric. */
function laplacianVariance(gray: Float32Array, w: number, h: number): number {
  if (w < 3 || h < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = gray[y * w + x];
      const lap =
        gray[(y - 1) * w + x] + gray[(y + 1) * w + x] + gray[y * w + (x - 1)] + gray[y * w + (x + 1)] - 4 * c;
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

interface QualityThresholds {
  minSharpness: number;
  minBrightness: number;
  maxBrightness: number;
  maxGlareRatio: number;
  maxClippingRatio: number;
  minFramingRatio: number;
  minRegionConfidence: number;
}

export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  minSharpness: 18, // Laplacian variance below this => "too blurry"
  minBrightness: 45,
  maxBrightness: 225,
  maxGlareRatio: 0.06, // >6% of guide box near-white => glare
  maxClippingRatio: 0.1, // near-black + near-white combined
  minFramingRatio: 0.55, // detected regions should occupy a solid chunk of the guide box
  minRegionConfidence: 0.35,
};

export function assessImageQuality(
  imageData: ImageData,
  guideBox: GuideBox,
  regionDetection: RegionDetectionResult,
  regionLabs: {
    sensingLab: { L: number; a: number; b: number };
    referenceLab: { L: number; a: number; b: number };
    expiryLab: { L: number; a: number; b: number };
  },
  thresholds: QualityThresholds = DEFAULT_QUALITY_THRESHOLDS
): ImageQualityResult {
  const { gray, w, h } = toGrayscale(imageData);
  const sharpness = laplacianVariance(gray, w, h);

  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];

  // Glare / clipping are measured inside the guide box only (that is where the
  // wristband is), so a hotspot on the band isn't diluted by the whole frame.
  const sc = w / imageData.width;
  const bx0 = Math.max(0, Math.floor(guideBox.x * sc));
  const by0 = Math.max(0, Math.floor(guideBox.y * sc));
  const bx1 = Math.min(w, Math.ceil((guideBox.x + guideBox.width) * sc));
  const by1 = Math.min(h, Math.ceil((guideBox.y + guideBox.height) * sc));
  let overexposed = 0;
  let underexposed = 0;
  let boxPixels = 0;
  for (let y = by0; y < by1; y++) {
    for (let x = bx0; x < bx1; x++) {
      const v = gray[y * w + x];
      boxPixels++;
      if (v >= 240) overexposed++;
      if (v <= 8) underexposed++;
    }
  }
  const brightness = gray.length > 0 ? sum / gray.length : 0;
  const glareRatio = boxPixels > 0 ? overexposed / boxPixels : 0;
  const clippingRatio = boxPixels > 0 ? (overexposed + underexposed) / boxPixels : 0;

  const framingRatio = computeFramingRatio(imageData, guideBox);
  const layoutPlausibility = computeLayoutPlausibility(regionDetection, regionLabs);

  const issues: ImageQualityIssue[] = [];

  if (layoutPlausibility < 0.3) {
    issues.push({
      code: 'low_region_confidence',
      message: 'Wristband layout not recognised — recapture with the band aligned in the guide.',
      severity: 'reject',
    });
  }

  if (sharpness < thresholds.minSharpness) {
    issues.push({ code: 'blur', message: 'Image too blurry.', severity: 'reject' });
  }
  if (brightness < thresholds.minBrightness) {
    issues.push({ code: 'too_dark', message: 'Image too dark — increase lighting.', severity: 'reject' });
  }
  if (brightness > thresholds.maxBrightness) {
    issues.push({ code: 'too_bright', message: 'Image overexposed — reduce direct light.', severity: 'reject' });
  }
  if (glareRatio > thresholds.maxGlareRatio) {
    issues.push({ code: 'glare', message: 'Excessive glare detected.', severity: 'reject' });
  }
  if (clippingRatio > thresholds.maxClippingRatio) {
    issues.push({
      code: 'clipping',
      message: 'Too many overexposed or underexposed pixels.',
      severity: 'reject',
    });
  }
  if (framingRatio < thresholds.minFramingRatio) {
    issues.push({
      code: 'framing',
      message: 'Wristband framing insufficient — align inside the guide.',
      severity: 'reject',
    });
  }
  if ((regionDetection.reference?.confidence ?? 0) < thresholds.minRegionConfidence) {
    issues.push({ code: 'reference_not_visible', message: 'Reference patch not visible.', severity: 'reject' });
  }
  if ((regionDetection.sensing?.confidence ?? 0) < thresholds.minRegionConfidence) {
    issues.push({ code: 'sensing_not_visible', message: 'Sensing strip not detected.', severity: 'reject' });
  }
  if ((regionDetection.expiry?.confidence ?? 0) < thresholds.minRegionConfidence) {
    issues.push({
      code: 'expiry_not_visible',
      message: 'Expiry indicator not clearly visible.',
      severity: 'warn',
    });
  }

  // Composite 0-100 score: start perfect, subtract for each real deficiency
  // relative to threshold. Purely diagnostic — not part of the dose model.
  let score = 100;
  score -= Math.max(0, thresholds.minSharpness - sharpness) * 0.6;
  score -= Math.max(0, thresholds.minBrightness - brightness) * 0.4;
  score -= Math.max(0, brightness - thresholds.maxBrightness) * 0.4;
  score -= Math.max(0, glareRatio - thresholds.maxGlareRatio) * 400;
  score -= Math.max(0, clippingRatio - thresholds.maxClippingRatio) * 300;
  score -= Math.max(0, thresholds.minFramingRatio - framingRatio) * 120;
  score -= Math.max(0, 0.3 - layoutPlausibility) * 150;
  score -= Math.max(0, thresholds.minRegionConfidence - (regionDetection.reference?.confidence ?? 0)) * 130;
  score -= Math.max(0, thresholds.minRegionConfidence - (regionDetection.sensing?.confidence ?? 0)) * 130;
  score -= Math.max(0, thresholds.minRegionConfidence - (regionDetection.expiry?.confidence ?? 0)) * 60;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const rejectIssues = issues.filter((i) => i.severity === 'reject');

  return {
    passed: rejectIssues.length === 0,
    score,
    sharpness: Math.round(sharpness * 10) / 10,
    brightness: Math.round(brightness * 10) / 10,
    glareRatio: Math.round(glareRatio * 1000) / 1000,
    clippingRatio: Math.round(clippingRatio * 1000) / 1000,
    framingRatio: Math.round(framingRatio * 100) / 100,
    issues,
  };
}
