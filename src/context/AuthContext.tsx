import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEMO_ACCOUNTS } from '../data/demoAccounts';
import { ROLE_LABEL, type Role } from '../data/roleAccess';

export interface Session {
  userId: string;
  name: string;
  role: Role;
  workerId: string | null;
  demo: boolean;
}

interface AuthValue {
  session: Session | null;
  login: (userId: string, password: string, role: Role, remember: boolean) => string | null;
  enterDemo: () => void;
  logout: () => void;
}

const KEY = 'h2s-dosimeter:session';
const ACTIVE_WORKER_KEY = 'h2s-dosimeter:active-worker-id';
const AuthContext = createContext<AuthValue | null>(null);

function load(): Session | null {
  try {
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    // Ignore a corrupted / outdated saved session rather than crashing.
    return s && s.role in ROLE_LABEL && typeof s.name === 'string' ? s : null;
  } catch {
    return null;
  }
}

// Prototype-only frontend authentication. Production deployment must move
// authentication and authorization to a trusted server/backend; localStorage/sessionStorage
// credentials and role checks are not a security boundary.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(load);

  const start = useCallback((s: Session, remember: boolean) => {
    // Never carry a previously selected worker into a new session.
    localStorage.removeItem(ACTIVE_WORKER_KEY);
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const login: AuthValue['login'] = useCallback(
    (userId, password, role, remember) => {
      const acct = DEMO_ACCOUNTS.find((a) => a.userId.toLowerCase() === userId.trim().toLowerCase());
      if (!acct || acct.password !== password) return 'Incorrect user ID or password.';
      if (acct.role !== role) return `This account is not a ${ROLE_LABEL[role]} account. Its role is ${ROLE_LABEL[acct.role]}.`;
      start({ userId: acct.userId, name: acct.name, role: acct.role, workerId: acct.workerId, demo: false }, remember);
      return null;
    },
    [start]
  );

  const enterDemo = useCallback(
    () => start({ userId: 'demo', name: 'Prototype Demo', role: 'safety_officer', workerId: null, demo: true }, false),
    [start]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(ACTIVE_WORKER_KEY);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, login, enterDemo, logout }), [session, login, enterDemo, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
