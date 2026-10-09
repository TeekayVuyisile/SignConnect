import { NavLink, Outlet } from 'react-router-dom';
import { Clock, GraduationCap, Settings, Users, WifiOff } from 'lucide-react';
import { Logo } from './ui.jsx';
import { useCalls } from '../lib/calls.jsx';

const NAV = [
  { to: '/app', label: 'Contacts', icon: Users, end: true },
  { to: '/app/recents', label: 'Recents', icon: Clock },
  { to: '/app/learn', label: 'Learn', icon: GraduationCap },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const { connected } = useCalls();

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn-primary">Skip to content</a>

      <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <nav aria-label="Main" className="hidden md:flex gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `btn px-4 ${isActive ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2'}`}>
                <Icon className="size-5" aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
        {!connected && (
          <div role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-warning-text font-bold text-[0.95rem]">
            <WifiOff className="size-5" aria-hidden="true" /> Reconnecting… calls are paused.
          </div>
        )}
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface md:hidden pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end}
                className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-bold transition-colors duration-200
                  ${isActive ? 'text-primary' : 'text-muted'}`}>
                {({ isActive }) => (
                  <>
                    <span className={`flex h-8 w-16 items-center justify-center rounded-full transition-colors duration-200 ${isActive ? 'bg-primary-soft' : ''}`}>
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
