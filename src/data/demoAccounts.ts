import type { Role } from './roleAccess';

// PROTOTYPE ONLY: local demo accounts. A real system must authenticate against
// a server and derive the role from the authenticated account.
export interface DemoAccount {
  userId: string;
  password: string;
  name: string;
  role: Role;
  workerId: string | null;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { userId: 'officer.demo', password: 'demo1234', name: 'Safety Officer (demo)', role: 'safety_officer', workerId: null },
  { userId: 'supervisor.demo', password: 'demo1234', name: 'Supervisor (demo)', role: 'supervisor', workerId: null },
  { userId: 'worker.demo', password: 'demo1234', name: 'Rahul Sharma', role: 'worker', workerId: 'W-002' },
];
