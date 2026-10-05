// ============================================================================
// QR wristband identification (Safety Officer workflow) + single-use enforcement helpers
// (spec §2).
//
// This is deliberately a thin resolver on top of the EXISTING wristband data
// model (types.Wristband, StorageService, wristbandLifecycle) — it does not
// introduce a second wristband database. A physical QR code encodes nothing
// more than the printed wristband ID (or a small JSON envelope carrying it);
// this module turns that raw decoded string into a verified Wristband
// record, or a structured rejection.
// ============================================================================

import type { RejectionCode, Shift, Wristband } from '../types';
import type { StorageService } from './storage/StorageService';
import { wristbandMeasurabilityGate } from '../utils/wristbandLifecycle';

export interface WristbandResolution {
  ok: boolean;
  wristband: Wristband | null;
  code: RejectionCode | null;
  message: string;
}

/**
 * Extract a wristband ID from whatever a QR code happens to encode.
 * Supports:
 *  - a bare ID ("WB-0241")
 *  - a small JSON envelope ({"wristbandId":"WB-0241"} or {"id":"WB-0241"})
 *  - a URL with a wristbandId/wb query parameter
 * Never decodes worker personal information — the band ID is the only thing
 * the QR is expected to carry (see BAND_ID_PRIVACY_NOTE).
 */
export function parseWristbandQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const candidate = obj.wristbandId ?? obj.wristband_id ?? obj.id ?? obj.wb;
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    } catch {
      // fall through to plain-text handling below
    }
  }

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get('wristbandId') ?? url.searchParams.get('wb') ?? url.searchParams.get('id');
    if (fromQuery) return fromQuery.trim();
    const lastSegment = url.pathname.split('/').filter(Boolean).pop();
    if (lastSegment) return decodeURIComponent(lastSegment);
  } catch {
    // not a URL — fall through
  }

  // Bare ID (e.g. "WB-0241"), the common/expected case.
  return trimmed;
}

/**
 * Resolve a decoded QR payload to a wristband record against the EXISTING
 * storage layer, and run the full measurability gate (exists, not expired,
 * not retired, not already used). Scanning the QR itself never mutates the
 * wristband — see spec §2's "scanning must NOT consume the wristband".
 */
export async function resolveWristbandFromQr(
  raw: string,
  storage: Pick<StorageService, 'getWristband' | 'listShifts'>
): Promise<WristbandResolution> {
  const id = parseWristbandQrPayload(raw);
  if (!id) {
    return { ok: false, wristband: null, code: 'INVALID_WRISTBAND', message: 'QR code did not contain a readable wristband ID.' };
  }

  const wristband = await storage.getWristband(id);
  if (!wristband) {
    return { ok: false, wristband: null, code: 'INVALID_WRISTBAND', message: `No wristband record found for "${id}".` };
  }

  const shifts: Shift[] = await storage.listShifts();
  const gate = wristbandMeasurabilityGate(wristband, shifts);
  if (!gate.ok) {
    return { ok: false, wristband, code: 'code' in gate ? gate.code : 'INVALID_WRISTBAND', message: 'message' in gate ? gate.message : 'Wristband validation failed.' };
  }

  return { ok: true, wristband, code: null, message: `Wristband ${wristband.id} verified.` };
}

/** Re-validate an already-resolved wristband ID right before committing a
 *  measurement, in case its state changed between QR scan and save (e.g. it
 *  was used by another capture, or expired, in the interim). */
export async function verifyWristbandStillMeasurable(
  wristbandId: string,
  storage: Pick<StorageService, 'getWristband' | 'listShifts'>
): Promise<WristbandResolution> {
  return resolveWristbandFromQr(wristbandId, storage);
}
