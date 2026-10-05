import type { Shift, Wristband } from '../types';

export type Lifecycle = 'available' | 'assigned' | 'active' | 'used' | 'expiring_soon' | 'expired' | 'retired';

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  available: 'Available',
  assigned: 'Assigned',
  active: 'Active',
  used: 'Used',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  retired: 'Retired',
};

const WEEK = 7 * 86_400_000;

/** Derive the lifecycle state from stored fields + live shifts. */
export function wristbandLifecycle(wb: Wristband, shifts: Shift[], now = Date.now()): Lifecycle {
  if (wb.status === 'retired') return 'retired';
  if (wb.status === 'expired' || wb.expiresAt <= now) return 'expired';
  // Single-use enforcement (spec §2): a committed measurement retires the
  // wristband from further quantitative use, independent of the existing
  // available/assigned/expired/retired `status` field.
  if (wb.usedAt) return 'used';
  if (wb.expiresAt - now < WEEK) return 'expiring_soon';
  if (shifts.some((s) => s.wristbandId === wb.id && s.status === 'active')) return 'active';
  return wb.assignedWorkerId ? 'assigned' : 'available';
}

/**
 * Whether a wristband is currently allowed to produce a new quantitative
 * measurement (spec §1/§2 gates). Used both by QR resolution (before the
 * optical scan) and as a final gate inside the scan pipeline.
 */
export function wristbandMeasurabilityGate(
  wb: Wristband,
  shifts: Shift[],
  now = Date.now()
): { ok: true } | { ok: false; code: 'BADGE_EXPIRED' | 'WRISTBAND_ALREADY_USED' | 'INVALID_WRISTBAND'; message: string } {
  const state = wristbandLifecycle(wb, shifts, now);
  if (state === 'retired') {
    return { ok: false, code: 'INVALID_WRISTBAND', message: 'This wristband has been retired and cannot be used.' };
  }
  if (state === 'expired') {
    return { ok: false, code: 'BADGE_EXPIRED', message: 'This wristband has expired. Quantitative measurement unavailable.' };
  }
  if (state === 'used') {
    return { ok: false, code: 'WRISTBAND_ALREADY_USED', message: 'This wristband has already been used for a measurement and cannot be reused.' };
  }
  return { ok: true };
}

export function getActiveShiftForWristband(wristbandId: string, shifts: Shift[]): Shift | null {
  return shifts.find((s) => s.wristbandId === wristbandId && s.status === 'active') ?? null;
}

export function validateWristbandAssignment(
  wb: Wristband,
  worker: { id: string; wristbandId: string | null },
  shifts: Shift[],
  now = Date.now(),
): { ok: true } | { ok: false; message: string } {
  const activeBandShift = getActiveShiftForWristband(wb.id, shifts);
  if (activeBandShift) return { ok: false, message: `Wristband ${wb.id} is linked to active shift ${activeBandShift.id}. End that shift first.` };
  const gate = wristbandMeasurabilityGate(wb, shifts, now);
  if (!gate.ok) return { ok: false, message: 'message' in gate ? gate.message : 'Wristband validation failed.' };
  if (wb.assignedWorkerId && wb.assignedWorkerId !== worker.id) {
    return { ok: false, message: `Wristband ${wb.id} is already assigned to another worker.` };
  }
  if (worker.wristbandId && worker.wristbandId !== wb.id) {
    return { ok: false, message: `Worker ${worker.id} already has wristband ${worker.wristbandId} assigned.` };
  }
  return { ok: true };
}
