// ============================================================================
// Real colour-science math: sRGB -> linear RGB -> CIE XYZ -> CIE L*a*b*
// and the full CIEDE2000 colour-difference formula.
//
// This is the actual pipeline described in spec §13. Nothing here is
// simulated — only the *dose calibration model* that consumes ΔE2000
// (see calibrationModel.ts) is a placeholder pending lab data.
// ============================================================================

import type { LabColor, RGB } from '../../types';

// D65 reference white, 2° observer (standard for sRGB).
const REF_X = 95.047;
const REF_Y = 100.0;
const REF_Z = 108.883;

function srgbChannelToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** sRGB (0-255 per channel) -> CIE XYZ (D65, 0-100 scale). */
export function rgbToXyz(rgb: RGB): { x: number; y: number; z: number } {
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);

  // sRGB -> XYZ (D65) matrix, scaled to 0-100.
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) * 100;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) * 100;
  return { x, y, z };
}

function xyzChannelToLab(t: number): number {
  const epsilon = 216 / 24389; // 0.008856...
  const kappa = 24389 / 27; // 903.3
  return t > epsilon ? Math.cbrt(t) : (kappa * t + 16) / 116;
}

/** CIE XYZ (D65) -> CIE L*a*b*. */
export function xyzToLab(xyz: { x: number; y: number; z: number }): LabColor {
  const fx = xyzChannelToLab(xyz.x / REF_X);
  const fy = xyzChannelToLab(xyz.y / REF_Y);
  const fz = xyzChannelToLab(xyz.z / REF_Z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** Convenience: sRGB straight to CIE L*a*b*. */
export function rgbToLab(rgb: RGB): LabColor {
  return xyzToLab(rgbToXyz(rgb));
}

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * CIEDE2000 colour difference (ΔE00) between two Lab colours.
 * Full implementation (Sharma, Wu & Dalal 2005 reference formula),
 * including the rotation term R_T that simpler ΔE76/ΔE94 formulas omit.
 */
export function deltaE2000(lab1: LabColor, lab2: LabColor): number {
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const CBar = (C1 + C2) / 2;

  const C7 = Math.pow(CBar, 7);
  const pow25_7 = Math.pow(25, 7);
  const G = 0.5 * (1 - Math.sqrt(C7 / (C7 + pow25_7)));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = a1p === 0 && b1 === 0 ? 0 : (rad2deg(Math.atan2(b1, a1p)) + 360) % 360;
  const h2p = a2p === 0 && b2 === 0 ? 0 : (rad2deg(Math.atan2(b2, a2p)) + 360) % 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else if (diff > 180) dhp = diff - 360;
    else dhp = diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp) / 2);

  const LBarp = (L1 + L2) / 2;
  const CBarp = (C1p + C2p) / 2;

  let hBarp: number;
  if (C1p * C2p === 0) {
    hBarp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hBarp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hBarp = (h1p + h2p + 360) / 2;
  } else {
    hBarp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(deg2rad(hBarp - 30)) +
    0.24 * Math.cos(deg2rad(2 * hBarp)) +
    0.32 * Math.cos(deg2rad(3 * hBarp + 6)) -
    0.2 * Math.cos(deg2rad(4 * hBarp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hBarp - 275) / 25, 2));

  const CBarp7 = Math.pow(CBarp, 7);
  const RC = 2 * Math.sqrt(CBarp7 / (CBarp7 + pow25_7));

  const SL = 1 + (0.015 * Math.pow(LBarp - 50, 2)) / Math.sqrt(20 + Math.pow(LBarp - 50, 2));
  const SC = 1 + 0.045 * CBarp;
  const SH = 1 + 0.015 * CBarp * T;

  const RT = -Math.sin(deg2rad(2 * dTheta)) * RC;

  const termL = dLp / (kL * SL);
  const termC = dCp / (kC * SC);
  const termH = dHp / (kH * SH);

  const dE = Math.sqrt(termL * termL + termC * termC + termH * termH + RT * termC * termH);
  return dE;
}

/** Simple Euclidean ΔL/Δa/Δb, kept alongside ΔE2000 for the technical panel. */
export function labDelta(lab1: LabColor, lab2: LabColor) {
  return {
    deltaL: lab2.L - lab1.L,
    deltaA: lab2.a - lab1.a,
    deltaB: lab2.b - lab1.b,
  };
}
