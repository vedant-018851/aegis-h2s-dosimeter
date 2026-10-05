import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { navForRole } from './navItems';

export function BottomNav() {
  const { session } = useAuth();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur safe-bottom md:hidden">
      <ul className="flex items-stretch justify-between px-1">
        {navForRole(session!.role).filter((i) => !i.desktopOnly).map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide transition-colors',
                  isActive ? 'text-accent-600' : 'text-ink-500'
                )
              }
            >
              {({ isActive }) =>
                item.emphasized ? (
                  <>
                    <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg shadow-accent-500/30 ring-4 ring-white">
                      <item.icon size={22} strokeWidth={2.2} />
                    </span>
                    <span className={isActive ? 'text-accent-600' : 'text-ink-600'}>{item.label}</span>
                  </>
                ) : (
                  <>
                    <item.icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                    <span>{item.label}</span>
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
