// ============================================================================
// js-aruco2 loader shim.
//
// js-aruco2 is a plain script that publishes itself via `this.AR = AR` /
// `this.CV = CV` rather than ES/CJS exports, so bundlers can't see its
// exports. We import the two source files as raw text (bundled at build time,
// so it works offline/PWA) and evaluate them once against a private context
// object, then read AR back from it.
// ============================================================================
import cvSource from 'js-aruco2/src/cv.js?raw';
import arucoSource from 'js-aruco2/src/aruco.js?raw';

export interface ArucoDetectorLike {
  detect(imageData: ImageData): { id: number; corners: { x: number; y: number }[] }[];
}
interface ArucoNamespace {
  Detector: new (config?: { dictionaryName?: string }) => ArucoDetectorLike;
}

let cached: ArucoNamespace | null = null;

export function loadAruco(): ArucoNamespace {
  if (cached) return cached;
  const ctx: Record<string, unknown> = {};
  // Scripts reference `this` at top level and use `require` only as a
  // fallback when `this.CV` is missing — we provide CV so it is never hit.
  new Function('require', cvSource).call(ctx, () => {
    throw new Error('unexpected require');
  });
  new Function('require', arucoSource).call(ctx, () => {
    throw new Error('unexpected require');
  });
  const AR = ctx.AR as ArucoNamespace | undefined;
  if (!AR?.Detector) throw new Error('js-aruco2 failed to initialise.');
  cached = AR;
  return AR;
}
