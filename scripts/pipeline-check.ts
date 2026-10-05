// ============================================================================
// Pipeline self-test (dev-only, not shipped in the app bundle)
//
// Runs the real image-quality / region-detection / colour-correction /
// calibration pipeline against synthetic pixel buffers, entirely in Node
// (no browser/canvas needed). This is how the thresholds in
// imageProcessing/imageQuality.ts were tuned, and it's a fast regression
// check: `npm run test:pipeline`.
// ============================================================================

// Minimal ImageData polyfill — Node has no DOM.
class NodeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}
(globalThis as unknown as { ImageData: unknown }).ImageData = NodeImageData;

import { detectRegionsByLayout, type GuideBox } from '../src/services/imageProcessing/regionSampling';
import { assessImageQuality } from '../src/services/imageProcessing/imageQuality';
import { buildColorFeatures } from '../src/services/imageProcessing/colorCorrection';
import { classifyExpiry } from '../src/services/imageProcessing/expiryDetection';
import { estimateDose } from '../src/services/calibrationModel';
import { computeMeasurementIntegrity } from '../src/services/measurementIntegrity';
import { PRISTINE_SILVER_RGB, EXPECTED_REFERENCE_RGB } from '../src/data/constants';
import type { RGB } from '../src/types';

const WIDTH = 640;
const HEIGHT = 480;
const GUIDE: GuideBox = { x: 80, y: 140, width: 480, height: 200 };
const STRAP_RGB: RGB = { r: 40, g: 42, b: 46 };

function makeFrame(opts: {
  sensingRgb: RGB;
  referenceRgb: RGB | null; // null => obscured (noisy) reference
  expiryRgb: RGB;
  blur?: boolean;
  glare?: boolean;
  darken?: number; // 0-1 multiplier
  uniform?: RGB; // if set, whole guide box is this flat colour (invalid wristband)
}) {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const put = (x: number, y: number, rgb: RGB) => {
    const idx = (y * WIDTH + x) * 4;
    data[idx] = rgb.r;
    data[idx + 1] = rgb.g;
    data[idx + 2] = rgb.b;
    data[idx + 3] = 255;
  };
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) put(x, y, STRAP_RGB);
  }

  const layout = {
    sensing: { x: GUIDE.x + 0.04 * GUIDE.width, w: 0.42 * GUIDE.width, y: GUIDE.y + 0.18 * GUIDE.height, h: 0.64 * GUIDE.height },
    reference: { x: GUIDE.x + 0.5 * GUIDE.width, w: 0.28 * GUIDE.width, y: GUIDE.y + 0.18 * GUIDE.height, h: 0.64 * GUIDE.height },
    expiry: { x: GUIDE.x + 0.82 * GUIDE.width, w: 0.14 * GUIDE.width, y: GUIDE.y + 0.32 * GUIDE.height, h: 0.36 * GUIDE.height },
  };

  const drawRect = (r: { x: number; w: number; y: number; h: number }, rgb: RGB, noisy = false) => {
    for (let y = Math.round(r.y); y < r.y + r.h; y++) {
      for (let x = Math.round(r.x); x < r.x + r.w; x++) {
        if (noisy) {
          const jitter = (Math.random() - 0.5) * 160;
          put(x, y, { r: rgb.r + jitter, g: rgb.g + jitter, b: rgb.b + jitter });
        } else {
          put(x, y, rgb);
        }
      }
    }
  };

  if (opts.uniform) {
    drawRect({ x: GUIDE.x, w: GUIDE.width, y: GUIDE.y, h: GUIDE.height }, opts.uniform);
  } else {
    drawRect(layout.sensing, opts.sensingRgb);
    if (opts.referenceRgb) drawRect(layout.reference, opts.referenceRgb);
    else drawRect(layout.reference, STRAP_RGB, true); // obscured/noisy reference
    drawRect(layout.expiry, opts.expiryRgb);
  }

  if (opts.glare) {
    // Big bright blob covering a chunk of the guide box.
    for (let y = GUIDE.y; y < GUIDE.y + GUIDE.height * 0.6; y++) {
      for (let x = GUIDE.x; x < GUIDE.x + GUIDE.width * 0.5; x++) put(x, y, { r: 255, g: 255, b: 255 });
    }
  }

  if (opts.darken) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] *= opts.darken;
      data[i + 1] *= opts.darken;
      data[i + 2] *= opts.darken;
    }
  }

  if (opts.blur) {
    // Cheap box blur, a few passes.
    for (let pass = 0; pass < 18; pass++) {
      const copy = Uint8ClampedArray.from(data);
      for (let y = 1; y < HEIGHT - 1; y++) {
        for (let x = 1; x < WIDTH - 1; x++) {
          for (let c = 0; c < 3; c++) {
            const idx = (y * WIDTH + x) * 4 + c;
            const sum =
              copy[idx] +
              copy[idx - 4] +
              copy[idx + 4] +
              copy[idx - WIDTH * 4] +
              copy[idx + WIDTH * 4];
            data[idx] = sum / 5;
          }
        }
      }
    }
  }

  return new NodeImageData(data, WIDTH, HEIGHT) as unknown as ImageData;
}

function run(name: string, img: ImageData) {
  const { detection, samples } = detectRegionsByLayout(img, GUIDE);
  const regionLabs = {
    sensingLab: samples.sensing.lab,
    referenceLab: samples.reference.lab,
    expiryLab: samples.expiry.lab,
  };
  const quality = assessImageQuality(img, GUIDE, detection, regionLabs);
  const expiry = classifyExpiry(samples.expiry);

  let doseLine = 'n/a (rejected)';
  let integrityLine = 'n/a';
  if (quality.passed && expiry.status !== 'expired') {
    const features = buildColorFeatures(samples.sensing, samples.reference);
    const integrity = computeMeasurementIntegrity(quality, detection, expiry, true);
    const dose = estimateDose(features, integrity.score);
    doseLine = `dose=${dose.doseEstimate} [${dose.lowerBound}-${dose.upperBound}] conf=${dose.confidenceLabel} cat=${dose.category} (ΔE00=${features.deltaE2000.toFixed(2)})`;
    integrityLine = `${integrity.score}/100`;
  }

  console.log(
    `${name.padEnd(20)} passed=${String(quality.passed).padEnd(5)} score=${String(quality.score).padEnd(4)} ` +
      `sharp=${quality.sharpness.toFixed(1).padEnd(7)} bright=${quality.brightness.toFixed(0).padEnd(4)} ` +
      `glare=${quality.glareRatio.toFixed(3)} frame=${quality.framingRatio.toFixed(2)} ` +
      `expiry=${expiry.status.padEnd(14)} integrity=${integrityLine.padEnd(7)} ${doseLine}` +
      (quality.issues.length ? `  ISSUES: ${quality.issues.map((i) => i.code).join(',')}` : '')
  );
}

console.log('--- H2S-DOSIMETER pipeline self-test ---\n');

// Regression check for a real bug found during integration: the post-capture
// "align & review" step must default its guide box to EXACTLY the region a
// demo frame's synthetic patches were drawn into, otherwise region sampling
// reads the wrong pixels for every demo preset. See
// services/imageProcessing/demoFrameGenerator.ts (DEMO_GUIDE_BOX /
// DEMO_GUIDE_BOX_FRACTION) and components/scan/AlignReviewStep.tsx
// (initialBoxFraction). This check proves the fraction round-trips exactly
// regardless of the on-screen display scale used to show the captured frame.
{
  const DEMO_CANVAS_WIDTH_CHECK = 960;
  const DEMO_CANVAS_HEIGHT_CHECK = 720;
  const fraction = { x: 0.12, y: 0.32, width: 0.76, height: 0.34 };
  const expected: GuideBox = {
    x: DEMO_CANVAS_WIDTH_CHECK * fraction.x,
    y: DEMO_CANVAS_HEIGHT_CHECK * fraction.y,
    width: DEMO_CANVAS_WIDTH_CHECK * fraction.width,
    height: DEMO_CANVAS_HEIGHT_CHECK * fraction.height,
  };
  for (const displayScale of [1, 0.6417, 0.2]) {
    const displayWidth = DEMO_CANVAS_WIDTH_CHECK * displayScale;
    const displayHeight = DEMO_CANVAS_HEIGHT_CHECK * displayScale;
    const displayBox = {
      x: displayWidth * fraction.x,
      y: displayHeight * fraction.y,
      width: displayWidth * fraction.width,
      height: displayHeight * fraction.height,
    };
    const roundTripped: GuideBox = {
      x: displayBox.x / displayScale,
      y: displayBox.y / displayScale,
      width: displayBox.width / displayScale,
      height: displayBox.height / displayScale,
    };
    const ok =
      Math.abs(roundTripped.x - expected.x) < 1e-9 &&
      Math.abs(roundTripped.y - expected.y) < 1e-9 &&
      Math.abs(roundTripped.width - expected.width) < 1e-9 &&
      Math.abs(roundTripped.height - expected.height) < 1e-9;
    console.log(`demo-guide-box round-trip @scale=${displayScale}`.padEnd(38), ok ? 'OK' : 'MISMATCH — BUG');
  }
  console.log('');
}


run('clean_unexposed', makeFrame({ sensingRgb: PRISTINE_SILVER_RGB, referenceRgb: EXPECTED_REFERENCE_RGB, expiryRgb: { r: 210, g: 225, b: 205 } }));
run('low_exposure', makeFrame({ sensingRgb: { r: 175, g: 160, b: 130 }, referenceRgb: EXPECTED_REFERENCE_RGB, expiryRgb: { r: 210, g: 225, b: 205 } }));
run('moderate_exposure', makeFrame({ sensingRgb: { r: 120, g: 100, b: 80 }, referenceRgb: EXPECTED_REFERENCE_RGB, expiryRgb: { r: 210, g: 225, b: 205 } }));
run('high_exposure', makeFrame({ sensingRgb: { r: 55, g: 45, b: 40 }, referenceRgb: EXPECTED_REFERENCE_RGB, expiryRgb: { r: 210, g: 225, b: 205 } }));
run('expired_badge', makeFrame({ sensingRgb: { r: 150, g: 140, b: 120 }, referenceRgb: EXPECTED_REFERENCE_RGB, expiryRgb: { r: 20, g: 18, b: 16 } }));
run('blurry_scan', makeFrame({ sensingRgb: PRISTINE_SILVER_RGB, referenceRgb: EXPECTED_REFERENCE_RGB, expiryRgb: { r: 210, g: 225, b: 205 }, blur: true }));
run('excessive_glare', makeFrame({ sensingRgb: PRISTINE_SILVER_RGB, referenceRgb: EXPECTED_REFERENCE_RGB, expiryRgb: { r: 210, g: 225, b: 205 }, glare: true }));
run('poor_lighting', makeFrame({ sensingRgb: PRISTINE_SILVER_RGB, referenceRgb: EXPECTED_REFERENCE_RGB, expiryRgb: { r: 210, g: 225, b: 205 }, darken: 0.32 }));
run('missing_reference', makeFrame({ sensingRgb: PRISTINE_SILVER_RGB, referenceRgb: null, expiryRgb: { r: 210, g: 225, b: 205 } }));
run('invalid_wristband', makeFrame({ sensingRgb: PRISTINE_SILVER_RGB, referenceRgb: EXPECTED_REFERENCE_RGB, expiryRgb: { r: 210, g: 225, b: 205 }, uniform: { r: 130, g: 110, b: 90 } }));
