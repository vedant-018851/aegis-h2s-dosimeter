// ============================================================================
// Demo Mode frame synthesis (spec §24)
//
// Demo Mode does not fabricate a dose number directly — it fabricates a
// plausible *photograph* (a real HTMLCanvasElement with real pixels for a
// clean/degraded wristband capture) and then runs that image through the
// exact same detection / quality / colour / calibration pipeline used for a
// real camera capture. This is what "mechanism demonstration only" means in
// practice: the mechanism is real, only the input photo is synthetic.
// ============================================================================

import type { DemoPresetId, RGB } from '../../types';
import { PRISTINE_SILVER_RGB, EXPECTED_REFERENCE_RGB, FULLY_CONVERTED_RGB } from '../../data/constants';
import type { GuideBox } from './regionSampling';

export const DEMO_CANVAS_WIDTH = 960;
export const DEMO_CANVAS_HEIGHT = 720;

export const DEMO_GUIDE_BOX: GuideBox = {
  x: DEMO_CANVAS_WIDTH * 0.12,
  y: DEMO_CANVAS_HEIGHT * 0.32,
  width: DEMO_CANVAS_WIDTH * 0.76,
  height: DEMO_CANVAS_HEIGHT * 0.34,
};

/** Same box, expressed as 0-1 fractions of the canvas — used by AlignReviewStep
 *  to pre-position its adjustable guide box exactly where a demo frame's
 *  synthetic patches were actually drawn, so the default (unadjusted) box
 *  samples the right pixels instead of drifting off the drawn regions. */
export const DEMO_GUIDE_BOX_FRACTION = {
  x: 0.12,
  y: 0.32,
  width: 0.76,
  height: 0.34,
};

const STRAP_RGB: RGB = { r: 38, g: 40, b: 45 };
const VALID_EXPIRY_RGB: RGB = { r: 205, g: 222, b: 200 };
const EXPIRED_EXPIRY_RGB: RGB = { r: 24, g: 22, b: 20 };

function rgbStr(rgb: RGB, alpha = 1): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function layoutRects(box: GuideBox): { sensing: LayoutRect; reference: LayoutRect; expiry: LayoutRect } {
  return {
    sensing: { x: box.x + 0.04 * box.width, y: box.y + 0.18 * box.height, w: 0.42 * box.width, h: 0.64 * box.height },
    reference: { x: box.x + 0.5 * box.width, y: box.y + 0.18 * box.height, w: 0.28 * box.width, h: 0.64 * box.height },
    expiry: { x: box.x + 0.82 * box.width, y: box.y + 0.32 * box.height, w: 0.14 * box.width, h: 0.36 * box.height },
  };
}

function drawBaseWristband(
  ctx: CanvasRenderingContext2D,
  box: GuideBox,
  sensingRgb: RGB,
  referenceRgb: RGB | 'noisy',
  expiryRgb: RGB,
  uniformOverride?: RGB
) {
  // Ambient background outside the strap (a neutral desk/skin tone).
  ctx.fillStyle = '#c9b8a6';
  ctx.fillRect(0, 0, DEMO_CANVAS_WIDTH, DEMO_CANVAS_HEIGHT);

  // Woven strap body, a little larger than the guide box.
  const strapPad = box.height * 0.35;
  ctx.fillStyle = rgbStr(STRAP_RGB);
  const strapX = box.x - strapPad * 0.6;
  const strapY = box.y - strapPad;
  const strapW = box.width + strapPad * 1.2;
  const strapH = box.height + strapPad * 2;
  roundRect(ctx, strapX, strapY, strapW, strapH, 24);
  ctx.fill();

  // Clear protective window (slightly lighter inset) behind the three patches.
  ctx.fillStyle = 'rgba(230,232,235,0.15)';
  roundRect(ctx, box.x, box.y, box.width, box.height, 14);
  ctx.fill();

  if (uniformOverride) {
    ctx.fillStyle = rgbStr(uniformOverride);
    ctx.fillRect(box.x, box.y, box.width, box.height);
    return;
  }

  const rects = layoutRects(box);

  ctx.fillStyle = rgbStr(sensingRgb);
  roundRect(ctx, rects.sensing.x, rects.sensing.y, rects.sensing.w, rects.sensing.h, 6);
  ctx.fill();

  if (referenceRgb === 'noisy') {
    // Simulate an obstructed/unreadable reference patch with high-variance noise.
    const imgData = ctx.getImageData(rects.reference.x, rects.reference.y, rects.reference.w, rects.reference.h);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const base = STRAP_RGB.r + (Math.random() - 0.5) * 180;
      imgData.data[i] = Math.max(0, Math.min(255, base + (Math.random() - 0.5) * 60));
      imgData.data[i + 1] = Math.max(0, Math.min(255, base + (Math.random() - 0.5) * 60));
      imgData.data[i + 2] = Math.max(0, Math.min(255, base + (Math.random() - 0.5) * 60));
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, rects.reference.x, rects.reference.y);
  } else {
    ctx.fillStyle = rgbStr(referenceRgb);
    roundRect(ctx, rects.reference.x, rects.reference.y, rects.reference.w, rects.reference.h, 6);
    ctx.fill();
  }

  ctx.fillStyle = rgbStr(expiryRgb);
  ctx.beginPath();
  ctx.ellipse(
    rects.expiry.x + rects.expiry.w / 2,
    rects.expiry.y + rects.expiry.h / 2,
    rects.expiry.w / 2,
    rects.expiry.h / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Builds a synthetic captured frame for the given demo preset. Real canvas pixels. */
export function generateDemoFrame(presetId: DemoPresetId): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = DEMO_CANVAS_WIDTH;
  canvas.height = DEMO_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const box = DEMO_GUIDE_BOX;

  switch (presetId) {
    case 'clean_unexposed': {
      drawBaseWristband(ctx, box, PRISTINE_SILVER_RGB, EXPECTED_REFERENCE_RGB, VALID_EXPIRY_RGB);
      break;
    }
    case 'low_exposure': {
      const sensing = lerpRgb(PRISTINE_SILVER_RGB, FULLY_CONVERTED_RGB, 0.22);
      drawBaseWristband(ctx, box, sensing, EXPECTED_REFERENCE_RGB, VALID_EXPIRY_RGB);
      break;
    }
    case 'moderate_exposure': {
      const sensing = lerpRgb(PRISTINE_SILVER_RGB, FULLY_CONVERTED_RGB, 0.5);
      drawBaseWristband(ctx, box, sensing, EXPECTED_REFERENCE_RGB, VALID_EXPIRY_RGB);
      break;
    }
    case 'high_exposure': {
      const sensing = lerpRgb(PRISTINE_SILVER_RGB, FULLY_CONVERTED_RGB, 0.88);
      drawBaseWristband(ctx, box, sensing, EXPECTED_REFERENCE_RGB, VALID_EXPIRY_RGB);
      break;
    }
    case 'expired_badge': {
      const sensing = lerpRgb(PRISTINE_SILVER_RGB, FULLY_CONVERTED_RGB, 0.35);
      drawBaseWristband(ctx, box, sensing, EXPECTED_REFERENCE_RGB, EXPIRED_EXPIRY_RGB);
      break;
    }
    case 'blurry_scan': {
      drawBaseWristband(ctx, box, PRISTINE_SILVER_RGB, EXPECTED_REFERENCE_RGB, VALID_EXPIRY_RGB);
      applyBlur(ctx, canvas);
      break;
    }
    case 'excessive_glare': {
      drawBaseWristband(ctx, box, PRISTINE_SILVER_RGB, EXPECTED_REFERENCE_RGB, VALID_EXPIRY_RGB);
      const grad = ctx.createRadialGradient(
        box.x + box.width * 0.32,
        box.y + box.height * 0.4,
        4,
        box.x + box.width * 0.32,
        box.y + box.height * 0.4,
        box.width * 0.42
      );
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.97)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, DEMO_CANVAS_WIDTH, DEMO_CANVAS_HEIGHT);
      break;
    }
    case 'poor_lighting': {
      drawBaseWristband(ctx, box, PRISTINE_SILVER_RGB, EXPECTED_REFERENCE_RGB, VALID_EXPIRY_RGB);
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, DEMO_CANVAS_WIDTH, DEMO_CANVAS_HEIGHT);
      break;
    }
    case 'missing_reference': {
      drawBaseWristband(ctx, box, PRISTINE_SILVER_RGB, 'noisy', VALID_EXPIRY_RGB);
      break;
    }
    case 'invalid_wristband': {
      drawBaseWristband(
        ctx,
        box,
        PRISTINE_SILVER_RGB,
        EXPECTED_REFERENCE_RGB,
        VALID_EXPIRY_RGB,
        { r: 150, g: 128, b: 104 }
      );
      break;
    }
    default:
      drawBaseWristband(ctx, box, PRISTINE_SILVER_RGB, EXPECTED_REFERENCE_RGB, VALID_EXPIRY_RGB);
  }

  return canvas;
}

function applyBlur(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  // Re-draw the canvas onto itself through a CSS-style blur filter to get a
  // genuinely soft-focus image (real pixel smoothing, not a fake overlay).
  const snapshot = document.createElement('canvas');
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  const sctx = snapshot.getContext('2d');
  if (!sctx) return;
  sctx.drawImage(canvas, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = 'blur(9px)';
  ctx.drawImage(snapshot, 0, 0);
  ctx.filter = 'none';
}
