import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { navForRole } from './navItems';
import { ShieldAlert } from 'lucide-react';
import { APP_NAME, PROBLEM_STATEMENT, TEAM_NAME } from '../../data/constants';

export function Sidebar() {
  const { session, logout } = useAuth();
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-ink-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-ink-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-accent-400">
          <ShieldAlert size={18} strokeWidth={2.2} />
        </span>
        <div>
          <p className="text-sm font-bold tracking-tight text-ink-900 leading-tight">{APP_NAME}</p>
          <p className="text-[11px] text-ink-500 leading-tight">Offline-first · prototype</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navForRole(session!.role).map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? item.emphasized
                        ? 'bg-accent-500 text-white shadow-sm'
                        : 'bg-ink-100 text-ink-900'
                      : item.emphasized
                        ? 'bg-accent-50 text-accent-700 hover:bg-accent-100'
                        : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                  )
                }
              >
                <item.icon size={18} strokeWidth={2.1} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-4 py-4 border-t border-ink-100 text-[11px] text-ink-400 leading-relaxed">
        <p className="mb-2 truncate font-semibold text-ink-600">{session?.name} · {session?.role.replace('_', ' ')} {session?.demo ? '· DEMO MODE' : ''}</p>
        <button onClick={logout} className="mb-3 min-h-11 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50">Sign out</button>
        <br />
        {PROBLEM_STATEMENT} · {TEAM_NAME}
        <br />
        Data stored locally on this device.
      </div>
    </aside>
  );
}
