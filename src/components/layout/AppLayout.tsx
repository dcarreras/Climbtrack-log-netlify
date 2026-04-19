import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, CalendarDays, Home, Menu, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

const mainTabs = [
  {
    href: '/home',
    label: 'Home',
    Icon: Home,
  },
  {
    href: '/planning',
    label: 'Plan',
    Icon: CalendarDays,
  },
  {
    href: '/sessions/new',
    label: 'Nueva sesión',
    Icon: Plus,
    isAction: true,
  },
  {
    href: '/analytics',
    label: 'Stats',
    Icon: BarChart3,
  },
  {
    href: '/profile',
    label: 'Menú',
    Icon: Menu,
  },
] as const;

const desktopNav = [
  { href: '/home', label: 'Home', Icon: Home },
  { href: '/planning', label: 'Planificación', Icon: CalendarDays },
  { href: '/analytics', label: 'Stats', Icon: BarChart3 },
  { href: '/profile', label: 'Menú', Icon: Menu },
] as const;

const shell = {
  bg: '#050505',
  ink: '#FAFAF9',
  inkMuted: 'rgba(250,250,249,0.62)',
  inkFaint: 'rgba(250,250,249,0.38)',
  rule: 'rgba(250,250,249,0.09)',
  ruleStrong: 'rgba(250,250,249,0.18)',
  accent: '#E23A1F',
};

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (href: string) => {
    if (href === '/home') return location.pathname === '/home' || location.pathname === '/dashboard';
    if (href === '/planning') return location.pathname === '/planning';
    if (href === '/analytics') {
      return (
        location.pathname === '/analytics' ||
        location.pathname.startsWith('/sessions') ||
        location.pathname.startsWith('/timer')
      );
    }
    if (href === '/profile') {
      return location.pathname === '/profile' || location.pathname.startsWith('/library');
    }
    if (href === '/sessions/new') return location.pathname === '/sessions/new';
    return location.pathname === href;
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-background"
      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
    >
      <aside
        className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col md:flex"
        style={{ background: shell.bg, borderRight: `1px solid ${shell.rule}` }}
      >
        <div className="px-6 pb-4 pt-6">
          <Link to="/home" className="inline-flex flex-col no-underline">
            <span
              style={{
                color: shell.ink,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
              }}
            >
              ASCEND
            </span>
            <span
              className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em]"
              style={{ color: shell.inkFaint }}
            >
              Climb Tracker
            </span>
          </Link>
        </div>

        <div className="mx-6 h-px" style={{ background: shell.rule }} />

        <nav className="flex-1 px-4 py-5">
          <div className="space-y-1">
            {desktopNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-3 px-3 py-3 no-underline transition-colors"
                  style={{
                    borderLeft: active ? `2px solid ${shell.accent}` : '2px solid transparent',
                    color: active ? shell.ink : shell.inkMuted,
                    paddingLeft: active ? 10 : 12,
                  }}
                >
                  <item.Icon className="h-4 w-4" />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <Link
            to="/sessions/new"
            className="mt-8 flex items-center justify-between border px-4 py-4 no-underline transition-colors"
            style={{
              background: isActive('/sessions/new') ? shell.ink : 'transparent',
              borderColor: isActive('/sessions/new') ? shell.ink : shell.ruleStrong,
              color: isActive('/sessions/new') ? shell.bg : shell.ink,
            }}
          >
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: isActive('/sessions/new') ? shell.bg : shell.inkFaint }}>
                Acción rápida
              </div>
              <div className="mt-1 text-base font-semibold tracking-[-0.02em]">Nueva sesión</div>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                background: isActive('/sessions/new') ? shell.bg : shell.ink,
                color: isActive('/sessions/new') ? shell.ink : shell.bg,
              }}
            >
              <Plus className="h-5 w-5" />
            </div>
          </Link>
        </nav>

        <div className="border-t px-6 py-5" style={{ borderColor: shell.rule }}>
          <button
            onClick={handleSignOut}
            className="w-full border px-4 py-3 text-[11px] uppercase tracking-[0.18em]"
            style={{
              background: 'transparent',
              borderColor: shell.ruleStrong,
              color: shell.inkMuted,
            }}
            type="button"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <header
        className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between px-5 md:hidden"
        style={{
          background: 'rgba(5,5,5,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${shell.rule}`,
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <Link to="/home" className="no-underline">
          <span
            style={{
              color: shell.ink,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            ASCEND
          </span>
        </Link>
        <span
          className="font-mono text-[9px] uppercase tracking-[0.2em]"
          style={{ color: shell.inkFaint }}
        >
          Climb Tracker
        </span>
      </header>

      <main className="min-h-screen overflow-x-hidden pt-14 md:ml-64 md:pt-0">
        <div className="mx-auto w-full max-w-5xl min-w-0 pb-28 md:pb-8">{children}</div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around md:hidden"
        style={{
          background: 'rgba(5,5,5,0.94)',
          backdropFilter: 'blur(24px)',
          borderTop: `1px solid ${shell.rule}`,
          height: 78,
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          paddingTop: 8,
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {mainTabs.map((tab) => {
          const active = isActive(tab.href);

          if (tab.isAction) {
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className="relative flex shrink-0 flex-col items-center no-underline"
                style={{ marginTop: -12, width: 72 }}
              >
                {active && (
                  <div
                    className="absolute -top-1 h-[2px] w-7"
                    style={{ background: shell.ink }}
                  />
                )}
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    background: shell.ink,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 6px rgba(5,5,5,0.94)',
                    color: shell.bg,
                  }}
                >
                  <tab.Icon className="h-6 w-6" strokeWidth={2.2} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1 px-2 no-underline"
            >
              {active && (
                <div
                  className="absolute -top-2 h-[2px] w-5"
                  style={{ background: shell.ink }}
                />
              )}
              <tab.Icon
                className="h-[19px] w-[19px]"
                style={{ color: active ? shell.ink : shell.inkFaint }}
              />
              <span
                style={{
                  color: active ? shell.ink : shell.inkFaint,
                  fontSize: 9,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
