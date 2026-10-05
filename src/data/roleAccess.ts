export type Role = 'safety_officer' | 'supervisor' | 'worker';

export const ROLE_LABEL: Record<Role, string> = {
  safety_officer: 'Safety Officer',
  supervisor: 'Supervisor',
  worker: 'Worker',
};

/** Routes shown in navigation for each role (spec: role behaviour). */

/** Scan mode is deliberately role-specific. Safety Officers verify the
 * wristband identity QR; Supervisors and Workers perform the optical
 * wristband scan of the reactive strip, reference patch and expiry indicator.
 */
export type ScanMode = 'qr_verification' | 'optical_wristband';

export const ROLE_SCAN_MODE: Record<Role, ScanMode> = {
  safety_officer: 'qr_verification',
  supervisor: 'optical_wristband',
  worker: 'optical_wristband',
};

export function canUseQrScan(role: Role): boolean {
  return ROLE_SCAN_MODE[role] === 'qr_verification';
}

export function canUseOpticalWristbandScan(role: Role): boolean {
  return ROLE_SCAN_MODE[role] === 'optical_wristband';
}

export const ROLE_NAV: Record<Role, string[]> = {
  safety_officer: ['/', '/workers', '/wristbands', '/history', '/calibration', '/demo', '/science', '/architecture', '/settings'],
  supervisor: ['/', '/workers', '/wristbands', '/history', '/scan', '/demo'],
  worker: ['/', '/scan', '/history', '/profile'],
};

/** Routes reachable but not shown in nav (flows that need them). */
const HIDDEN_ACCESS: Record<Role, string[]> = {
  safety_officer: ['/scan', '/profile'],
  supervisor: ['/profile'],
  worker: ['/workers'],
};

export function canAccess(role: Role, demo: boolean, pathname: string): boolean {
  const allowed = [...ROLE_NAV[role], ...HIDDEN_ACCESS[role], ...(demo ? ['/scan'] : [])];
  return allowed.some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/')));
}
