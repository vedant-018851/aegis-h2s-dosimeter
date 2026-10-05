import { ShieldAlert, ChevronDown } from 'lucide-react';
import { APP_NAME } from '../../data/constants';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TopBar() {
  const { activeWorker } = useAppContext();
  const navigate = useNavigate();
  const { logout, session } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-200 bg-white/95 backdrop-blur px-4 py-3 safe-top md:hidden">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-accent-400">
          <ShieldAlert size={16} strokeWidth={2.2} />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-bold tracking-tight text-ink-900">{APP_NAME}</p>
          <div className="flex items-center gap-1.5"><p className="text-[10px] text-ink-500">Offline-first · prototype</p>{session?.demo && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-800">Demo mode</span>}</div>
        </div>
      </div>

      <button
        onClick={() => navigate('/workers')}
        className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 pl-1 pr-2.5 py-1 text-xs font-semibold text-ink-700 active:scale-95 transition-transform"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-800 text-[10px] font-bold text-white">
          {activeWorker ? activeWorker.name.charAt(0) : '?'}
        </span>
        <span className="max-w-[110px] truncate">{activeWorker ? activeWorker.name : 'Select worker'}</span>
        <ChevronDown size={12} />
      </button>
      <button onClick={logout} aria-label="Sign out" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600"><LogOut size={18} /></button>
    </header>
  );
}
