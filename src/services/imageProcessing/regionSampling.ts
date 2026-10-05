// ============================================================================
// Region sampling
//
// Real pixel-level work: given a captured frame and the on-screen alignment
// guide rectangle, this locates the three physical regions of the wristband
// (spec §9) using the KNOWN LAYOUT PROPORTIONS approach explicitly permitted
// by the spec, rather than ML object detection. It then samples the actual
// mean/stddev colour of each region from the real ImageData.
//
// Layout (left to right, matching the physical wristband):
//   [ Ag/Ag2S SENSING STRIP ] [ FIXED NEUTRAL REFERENCE ] [ EXPIRY DOT ]
// ============================================================================

import type { DetectedRegion, RGB, RegionColorSample, RegionDetectionResult } from '../../types';
import { rgbToLab } from '../colorScience';

export interface GuideBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Fractional layout of the guide box, tuned to the physical wristband
// proportions described in the spec. Kept as named constants so a future
// fiducial-marker detector can override them per-frame instead of assuming
// a fixed guide box.
const LAYOUT = {
  sensing: { xFrac: 0.04, wFrac: 0.42, yFrac: 0.18, hFrac: 0.64 },
  reference: { xFrac: 0.5, wFrac: 0.28, yFrac: 0.18, hFrac: 0.64 },
  expiry: { xFrac: 0.82, wFrac: 0.14, yFrac: 0.32, hFrac: 0.36 },
};

function fracToRegion(box: GuideBox, frac: typeof LAYOUT.sensing): DetectedRegion {
  return {
    x: Math.round(box.x + frac.xFrac * box.width),
    y: Math.round(box.y + frac.yFrac * box.height),
    width: Math.round(frac.wFrac * box.width),
    height: Math.round(frac.hFrac * box.height),
    confidence: 0, // filled in by the caller once uniformity is measured
  };
}

/** Sample real mean + stddev colour from a rectangular region of ImageData. */
export function sampleRegion(imageData: ImageData, region: DetectedRegion): RegionColorSample {
  const { data, width: imgWidth, height: imgHeight } = imageData;
  // Sample only the central 60% of the region: edges bleed into the strap and
  // round indicators (the expiry dot) don't fill their bounding box.
  const insetX = region.width * 0.2;
  const insetY = region.height * 0.2;
  const x0 = Math.max(0, Math.ceil(region.x + insetX));
  const y0 = Math.max(0, Math.ceil(region.y + insetY));
  const x1 = Math.min(imgWidth, Math.floor(region.x + region.width - insetX));
  const y1 = Math.min(imgHeight, Math.floor(region.y + region.height - insetY));

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumR2 = 0;
  let sumG2 = 0;
  let sumB2 = 0;
  let n = 0;

  // Sample on a grid rather than every pixel to keep this fast on phones.
  const stepX = Math.max(1, Math.floor((x1 - x0) / 60));
  const stepY = Math.max(1, Math.floor((y1 - y0) / 60));

  for (let y = y0; y < y1; y += stepY) {
    for (let x = x0; x < x1; x += stepX) {
      const idx = (y * imgWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      sumR += r;
      sumG += g;
      sumB += b;
      sumR2 += r * r;
      sumG2 += g * g;
      sumB2 += b * b;
      n++;
    }
  }

  if (n === 0) {
    const zero: RGB = { r: 0, g: 0, b: 0 };
    return { meanRgb: zero, stdDevRgb: zero, lab: rgbToLab(zero), sampledPixels: 0 };
  }

  const meanRgb: RGB = { r: sumR / n, g: sumG / n, b: sumB / n };
  const varR = Math.max(0, sumR2 / n - meanRgb.r * meanRgb.r);
  const varG = Math.max(0, sumG2 / n - meanRgb.g * meanRgb.g);
  const varB = Math.max(0, sumB2 / n - meanRgb.b * meanRgb.b);
  const stdDevRgb: RGB = { r: Math.sqrt(varR), g: Math.sqrt(varG), b: Math.sqrt(varB) };

  return { meanRgb, stdDevRgb, lab: rgbToLab(meanRgb), sampledPixels: n };
}

/** Uniformity-based confidence: a tight colour cluster => confident ROI. */
function regionConfidence(sample: RegionColorSample): number {
  const avgStd = (sample.stdDevRgb.r + sample.stdDevRgb.g + sample.stdDevRgb.b) / 3;
  // Empirically: std < 8 -> very confident, std > 45 -> not confident at all.
  const confidence = 1 - Math.min(1, Math.max(0, (avgStd - 8) / 37));
  return Math.round(confidence * 100) / 100;
}

/**
 * Detect the three wristband regions inside the guide box using known
 * layout proportions, then measure each region's colour and confidence.
 */
export function detectRegionsByLayout(
  imageData: ImageData,
  guideBox: GuideBox
): { detection: RegionDetectionResult; samples: { sensing: RegionColorSample; reference: RegionColorSample; expiry: RegionColorSample } } {
  const sensingRegion = fracToRegion(guideBox, LAYOUT.sensing);
  const referenceRegion = fracToRegion(guideBox, LAYOUT.reference);
  const expiryRegion = fracToRegion(guideBox, LAYOUT.expiry);

  const sensingSample = sampleRegion(imageData, sensingRegion);
  const referenceSample = sampleRegion(imageData, referenceRegion);
  const expirySample = sampleRegion(imageData, expiryRegion);

  sensingRegion.confidence = regionConfidence(sensingSample);
  referenceRegion.confidence = regionConfidence(referenceSample);
  expiryRegion.confidence = regionConfidence(expirySample);

  const overallConfidence =
    (sensingRegion.confidence + referenceRegion.confidence + expiryRegion.confidence) / 3;

  return {
    detection: {
      sensing: sensingRegion,
      reference: referenceRegion,
      expiry: expiryRegion,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      method: 'layout-proportion',
    },
    samples: { sensing: sensingSample, reference: referenceSample, expiry: expirySample },
  };
}

/** Manual ROI fallback: caller supplies three rectangles directly (spec §8). */
export function detectRegionsManual(
  imageData: ImageData,
  rects: { sensing: DetectedRegion; reference: DetectedRegion; expiry: DetectedRegion }
) {
  const sensingSample = sampleRegion(imageData, rects.sensing);
  const referenceSample = sampleRegion(imageData, rects.reference);
  const expirySample = sampleRegion(imageData, rects.expiry);

  rects.sensing.confidence = regionConfidence(sensingSample);
  rects.reference.confidence = regionConfidence(referenceSample);
  rects.expiry.confidence = regionConfidence(expirySample);

  const overallConfidence = (rects.sensing.confidence + rects.reference.confidence + rects.expiry.confidence) / 3;

  const detection: RegionDetectionResult = {
    sensing: rects.sensing,
    reference: rects.reference,
    expiry: rects.expiry,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    method: 'manual-roi',
  };

  return { detection, samples: { sensing: sensingSample, reference: referenceSample, expiry: expirySample } };
}
