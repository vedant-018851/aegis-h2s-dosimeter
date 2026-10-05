// ============================================================================
// ArUco automatic alignment + perspective correction (spec §3/§4).
//
// Purely an alignment ENHANCEMENT layered in front of the existing pipeline:
// detect four ArUco markers arranged at the corners of the capture area,
// perspective-correct the frame into a normalized rectangle, then hand that
// rectified canvas to the EXISTING guide-box / region-detection pipeline
// exactly like any other captured frame. If markers aren't found, the caller
// falls back to the existing manual/guide-box alignment — this module never
// throws for "no markers found", it returns a typed failure instead.
//
// Uses js-aruco2 (a small pure-JS ArUco port, no OpenCV/WASM) for detection
// only. The perspective warp itself is a self-contained square-to-quad
// projective mapping (Heckbert's classic formula) — no extra CV dependency
// and no duplicate ROI/colour pipeline; the output of this module is just a
// normalized HTMLCanvasElement fed back into services/imageProcessing/regionSampling.ts.
// ============================================================================

import { loadAruco, type ArucoDetectorLike } from './arucoLoader';

export interface Point {
  x: number;
  y: number;
}

export interface ArucoAlignmentSuccess {
  ok: true;
  rectified: HTMLCanvasElement;
  /** The four detected marker centers in the ORIGINAL frame, TL/TR/BR/BL. */
  corners: [Point, Point, Point, Point];
}

export interface ArucoAlignmentFailure {
  ok: false;
  reason: string;
}

export type ArucoAlignmentResult = ArucoAlignmentSuccess | ArucoAlignmentFailure;

/** Expected marker arrangement: one marker id at each corner of the capture area. */
export const EXPECTED_MARKER_IDS = { topLeft: 0, topRight: 1, bottomRight: 2, bottomLeft: 3 } as const;

// Output size matches the existing demo-frame canvas dimensions, so the
// existing layout-proportion ROI constants behave exactly as they do today.
export const RECTIFIED_WIDTH = 960;
export const RECTIFIED_HEIGHT = 720;

const DETECTION_MAX_DIM = 640; // downscaled working resolution for marker detection speed

let detectorSingleton: ArucoDetectorLike | null = null;

function getDetector(): ArucoDetectorLike {
  if (detectorSingleton) return detectorSingleton;
  const AR = loadAruco();
  detectorSingleton = new AR.Detector({ dictionaryName: 'ARUCO' });
  return detectorSingleton;
}

function markerCenter(corners: Point[]): Point {
  const n = corners.length || 1;
  const sum = corners.reduce((acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}

/**
 * Square (unit, u/v in [0,1]) -> quad projective mapping coefficients
 * (Heckbert, "Fundamentals of Texture Mapping and Image Warping", 1989).
 * Returns {a..i} such that X = (a*u+b*v+c)/(g*u+h*v+i), Y = (d*u+e*v+f)/(g*u+h*v+i).
 */
export function squareToQuad(quad: [Point, Point, Point, Point]) {
  const [p0, p1, p2, p3] = quad; // (0,0) (1,0) (1,1) (0,1)
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;

  let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;
  const i = 1;

  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    // Degenerate (already a parallelogram) — pure affine map.
    a = p1.x - p0.x;
    b = p2.x - p1.x;
    c = p0.x;
    d = p1.y - p0.y;
    e = p2.y - p1.y;
    f = p0.y;
    g = 0;
    h = 0;
  } else {
    const denom = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(denom) < 1e-9) throw new Error('Degenerate marker quad geometry.');
    g = (dx3 * dy2 - dx2 * dy3) / denom;
    h = (dx1 * dy3 - dx3 * dy1) / denom;
    a = p1.x - p0.x + g * p1.x;
    b = p3.x - p0.x + h * p3.x;
    c = p0.x;
    d = p1.y - p0.y + g * p1.y;
    e = p3.y - p0.y + h * p3.y;
    f = p0.y;
  }
  return { a, b, c, d, e, f, g, h, i };
}

/** Bilinear-sample a source ImageData at fractional (x, y). */
function sampleBilinear(src: ImageData, x: number, y: number, out: Uint8ClampedArray, outIdx: number) {
  const { data, width, height } = src;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 >= width - 1 || y0 >= height - 1) {
    out[outIdx] = 0;
    out[outIdx + 1] = 0;
    out[outIdx + 2] = 0;
    out[outIdx + 3] = 255;
    return;
  }
  const fx = x - x0;
  const fy = y - y0;
  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x0 + 1) * 4;
  const i01 = ((y0 + 1) * width + x0) * 4;
  const i11 = ((y0 + 1) * width + x0 + 1) * 4;
  for (let c = 0; c < 4; c++) {
    const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx;
    const bottom = data[i01 + c] * (1 - fx) + data[i11 + c] * fx;
    out[outIdx + c] = Math.round(top * (1 - fy) + bottom * fy);
  }
}

/** Perspective-warp the quad region of `source` bounded by the four corners into a normalized rectangle. */
export function warpQuadToRect(
  source: HTMLCanvasElement,
  quad: [Point, Point, Point, Point],
  outWidth = RECTIFIED_WIDTH,
  outHeight = RECTIFIED_HEIGHT
): HTMLCanvasElement {
  const srcCtx = source.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) throw new Error('Could not read source canvas.');
  const srcData = srcCtx.getImageData(0, 0, source.width, source.height);

  const { a, b, c, d, e, f, g, h, i } = squareToQuad(quad);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outWidth;
  outCanvas.height = outHeight;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Could not create rectified canvas.');
  const outImageData = outCtx.createImageData(outWidth, outHeight);

  for (let Y = 0; Y < outHeight; Y++) {
    const v = Y / outHeight;
    for (let X = 0; X < outWidth; X++) {
      const u = X / outWidth;
      const denom = g * u + h * v + i;
      const srcX = (a * u + b * v + c) / denom;
      const srcY = (d * u + e * v + f) / denom;
      sampleBilinear(srcData, srcX, srcY, outImageData.data, (Y * outWidth + X) * 4);
    }
  }

  outCtx.putImageData(outImageData, 0, 0);
  return outCanvas;
}

/**
 * Detect the four corner ArUco markers in `frame` and, if found, return a
 * perspective-rectified normalized frame. Never throws for "not found" —
 * callers should fall back to existing manual alignment on `ok: false`.
 */
export function detectArucoAlignment(frame: HTMLCanvasElement): ArucoAlignmentResult {
  try {
    const detector = getDetector();

    const scale = Math.min(1, DETECTION_MAX_DIM / Math.max(frame.width, frame.height));
    const detCanvas = document.createElement('canvas');
    detCanvas.width = Math.max(1, Math.round(frame.width * scale));
    detCanvas.height = Math.max(1, Math.round(frame.height * scale));
    const detCtx = detCanvas.getContext('2d', { willReadFrequently: true });
    if (!detCtx) return { ok: false, reason: 'Could not prepare frame for marker detection.' };
    detCtx.drawImage(frame, 0, 0, detCanvas.width, detCanvas.height);
    const imageData = detCtx.getImageData(0, 0, detCanvas.width, detCanvas.height);

    const markers = detector.detect(imageData);
    if (!markers || markers.length < 4) {
      return { ok: false, reason: `ArUco markers not detected (found ${markers?.length ?? 0}/4).` };
    }

    const byId = new Map<number, Point>();
    for (const m of markers) byId.set(m.id, markerCenter(m.corners));

    const { topLeft, topRight, bottomRight, bottomLeft } = EXPECTED_MARKER_IDS;
    if (![topLeft, topRight, bottomRight, bottomLeft].every((id) => byId.has(id))) {
      return { ok: false, reason: 'Expected marker arrangement (IDs 0–3) not fully found.' };
    }

    // Scale detected corners back up from the downscaled detection frame to
    // the original full-resolution frame before warping, for image quality.
    const toFrame = (p: Point): Point => ({ x: p.x / scale, y: p.y / scale });
    const corners: [Point, Point, Point, Point] = [
      toFrame(byId.get(topLeft)!),
      toFrame(byId.get(topRight)!),
      toFrame(byId.get(bottomRight)!),
      toFrame(byId.get(bottomLeft)!),
    ];

    // Basic geometry sanity check — reject implausible/degenerate quads
    // rather than producing a misleading rectified image (spec §4).
    const width1 = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
    const width2 = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
    const height1 = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
    const height2 = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
    if (width1 < 20 || width2 < 20 || height1 < 20 || height2 < 20) {
      return { ok: false, reason: 'Detected marker geometry too small/degenerate to rectify reliably.' };
    }
    const aspectA = width1 / height1;
    const aspectB = width2 / height2;
    if (aspectA <= 0 || aspectB <= 0 || Math.max(aspectA, aspectB) / Math.min(aspectA, aspectB) > 2.5) {
      return { ok: false, reason: 'Detected marker geometry too skewed to rectify reliably.' };
    }

    const rectified = warpQuadToRect(frame, corners);
    return { ok: true, rectified, corners };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'ArUco detection failed.' };
  }
}
