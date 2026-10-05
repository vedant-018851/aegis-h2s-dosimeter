import {
  LayoutDashboard,
  ScanLine,
  Users,
  History,
  FlaskConical,
  Settings,
  Watch,
  BookOpen,
  Network,
  PlayCircle,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  emphasized?: boolean;
  desktopOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan', label: 'Scan', icon: ScanLine, emphasized: true },
  { to: '/workers', label: 'Workers', icon: Users },
  { to: '/history', label: 'History', icon: History },
  { to: '/calibration', label: 'Calibration', icon: FlaskConical },
  { to: '/wristbands', label: 'Wristbands', icon: Watch, desktopOnly: true },
  { to: '/demo', label: 'Demo Center', icon: PlayCircle, desktopOnly: true },
  { to: '/science', label: 'How It Works', icon: BookOpen, desktopOnly: true },
  { to: '/architecture', label: 'Architecture', icon: Network, desktopOnly: true },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
];

import { ROLE_NAV, type Role } from '../../data/roleAccess';

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => ROLE_NAV[role].includes(i.to)).map((i) =>
    role === 'worker' && i.to === '/history' ? { ...i, label: 'My History' } : i
  );
}
