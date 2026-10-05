// ============================================================================
// Expiry indicator reading (spec §11)
//
// The expiry dot is a separate colour-change indicator from the sensing
// strip. In the absence of a characterised real expiry ink, this uses a
// simple, clearly-labelled heuristic on the sampled patch lightness/chroma
// so the *mechanism* (sample -> classify -> gate quantitative output) is
// real and demonstrable, even though the exact thresholds are placeholders
// pending the real expiry-ink formulation.
// ============================================================================

import type { ExpiryResult, RegionColorSample } from '../../types';

const MIN_CONFIDENCE_TO_TRUST = 0.35;

export function classifyExpiry(expirySample: RegionColorSample): ExpiryResult {
  const avgStd = (expirySample.stdDevRgb.r + expirySample.stdDevRgb.g + expirySample.stdDevRgb.b) / 3;
  const confidence = Math.max(0, Math.min(1, 1 - (avgStd - 6) / 40));

  if (confidence < MIN_CONFIDENCE_TO_TRUST || expirySample.sampledPixels < 8) {
    return { status: 'unreadable', confidence };
  }

  const { L } = expirySample.lab;

  // Placeholder rule: a bright, low-chroma dot reads VALID; as the demo
  // ink darkens the dot reads EXPIRING_SOON then EXPIRED. Replace these
  // three cut points with real ink-response data once available.
  if (L >= 55) return { status: 'valid', confidence };
  if (L >= 35) return { status: 'expiring_soon', confidence };
  return { status: 'expired', confidence };
}
