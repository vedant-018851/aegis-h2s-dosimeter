import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, ShieldAlert, PlayCircle } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../data/constants';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL, type Role } from '../data/roleAccess';

const ROLES: Role[] = ['safety_officer', 'supervisor', 'worker'];
const HINT: Record<Role, string> = { safety_officer: 'officer.demo', supervisor: 'supervisor.demo', worker: 'worker.demo' };
const field =
  'min-h-12 w-full rounded-xl border border-ink-300 bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors duration-300 focus:border-accent-500 focus:outline-2 focus:outline-accent-500';

export function LoginPage() {
  const { login, enterDemo } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [role, setRole] = useState<Role>('safety_officer');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setNote(false);
    setError(login(userId, password, role, remember));
  };

  return (
    <div className="flex min-h-screen bg-ink-50">
      <div className="flex w-full flex-col justify-between px-5 py-8 sm:px-10 lg:w-[46%] lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-900 text-accent-400">
              <ShieldAlert size={22} aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink-900">{APP_NAME}</h1>
              <p className="text-xs text-ink-500">{APP_TAGLINE}</p>
            </div>
          </div>
          <span className="mb-5 inline-block rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900">
            Prototype System · Lab Calibration Pending
          </span>

          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-ink-900">Welcome back</h2>
              <p className="text-sm text-ink-500">Sign in to continue</p>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-ink-700">Sign in as</legend>
              <div role="radiogroup" className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={role === r}
                    onClick={() => { setRole(r); setError(null); }}
                    className={`min-h-12 rounded-xl border px-2 text-xs font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-accent-500 ${
                      role === r ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-300 bg-white text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-ink-500">Prototype: role is checked against the demo account. Try {HINT[role]} / demo1234.</p>
            </fieldset>

            <div>
              <label htmlFor="uid" className="mb-1 block text-xs font-semibold text-ink-700">User ID / Email</label>
              <input id="uid" className={field} placeholder="Enter your user ID" autoComplete="username" value={userId} onChange={(e) => setUserId(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="pw" className="mb-1 block text-xs font-semibold text-ink-700">Password</label>
              <div className="relative">
                <input id="pw" className={`${field} pr-12`} type={show ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-500 hover:text-ink-900">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex min-h-11 items-center gap-2 text-ink-700">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4" /> Remember me
              </label>
              <button type="button" onClick={() => setNote(true)} className="min-h-11 font-semibold text-accent-700 hover:underline">Forgot password?</button>
            </div>
            {note && <p role="status" className="text-xs text-ink-600">Password reset is not available in this prototype.</p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

            <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 text-sm font-bold tracking-wide text-white transition-colors duration-300 hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500">
              SIGN IN <ArrowRight size={16} aria-hidden />
            </button>
          </form>

          <div className="mt-4 rounded-2xl border border-dashed border-ink-300 bg-white/60 p-4 sm:p-5">
            <h3 className="text-sm font-bold text-ink-900">Prototype Demo</h3>
            <p className="mb-3 mt-0.5 text-xs text-ink-500">Explore the system using simulated measurements and predefined scan scenarios.</p>
            <button onClick={enterDemo} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-ink-300 bg-white text-sm font-bold tracking-wide text-ink-900 transition-colors duration-300 hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-accent-500">
              <PlayCircle size={16} aria-hidden /> ENTER DEMO MODE
            </button>
          </div>
        </div>
        <p className="mt-8 text-center text-[11px] font-semibold tracking-wide text-ink-500">Prototype System · LAB CALIBRATION PENDING</p>
      </div>

      <aside className="relative hidden flex-1 items-center justify-center overflow-hidden border-l border-ink-200 bg-white lg:flex" style={{ backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        <div className="mx-8 w-full max-w-lg rounded-3xl border border-ink-200 bg-white/95 p-8 shadow-sm">
          <p className="text-xs font-bold tracking-[0.2em] text-ink-500">H₂S EXPOSURE MONITORING</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">Wear → Scan → Analyse → Record</p>
          <svg viewBox="0 0 400 150" className="my-6 w-full" role="img" aria-label="Stylised wristband with silver sensing strip, grey reference patch and expiry indicator">
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e5e7eb" /><stop offset="0.6" stopColor="#c4c7cc" /><stop offset="1" stopColor="#6b6157" /></linearGradient>
            </defs>
            <rect x="10" y="40" width="380" height="70" rx="35" fill="#111827" />
            <rect x="60" y="55" width="150" height="40" rx="6" fill="url(#ag)" />
            <rect x="230" y="55" width="40" height="40" rx="6" fill="#808080" />
            <circle cx="320" cy="75" r="14" fill="#22c55e" stroke="#fff" strokeWidth="3" />
            <g fontSize="11" fill="#374151" fontFamily="sans-serif">
              <text x="135" y="30" textAnchor="middle">Ag/Ag₂S sensing strip</text>
              <text x="250" y="130" textAnchor="middle">Reference patch</text>
              <text x="320" y="30" textAnchor="middle">Expiry indicator</text>
            </g>
          </svg>
          <div className="flex gap-2">
            {['Passive', 'Smartphone-based', 'Offline-first'].map((t) => (
              <span key={t} className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-700">{t}</span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
