import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const mainTabs = [
  {
    href: '/home',
    label: 'Feed',
    icon: (active: boolean) => (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V11z"
          stroke={active ? '#FAFAF9' : 'rgba(250,250,249,0.38)'} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/planning',
    label: 'Plan',
    icon: (active: boolean) => (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="16" rx="1.5" stroke={active ? '#FAFAF9' : 'rgba(250,250,249,0.38)'} strokeWidth="1.6" />
        <path d="M3 10h18M8 3v4M16 3v4" stroke={active ? '#FAFAF9' : 'rgba(250,250,249,0.38)'} strokeWidth="1.6" strokeLinecap="round" />
        <rect x="7" y="13" width="3" height="3" fill={active ? '#FAFAF9' : 'rgba(250,250,249,0.38)'} />
      </svg>
    ),
  },
  {
    href: '/sessions/new',
    label: '',
    isAction: true,
    icon: () => (
      <svg width={24} height={24} viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" stroke="#050505" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Stats',
    icon: (active: boolean) => (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2"
          stroke={active ? '#FAFAF9' : 'rgba(250,250,249,0.38)'} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Menú',
    icon: (active: boolean) => (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <circle cx="5" cy="6" r="1.5" fill={active ? '#FAFAF9' : 'rgba(250,250,249,0.38)'} />
        <circle cx="5" cy="12" r="1.5" fill={active ? '#FAFAF9' : 'rgba(250,250,249,0.38)'} />
        <circle cx="5" cy="18" r="1.5" fill={active ? '#FAFAF9' : 'rgba(250,250,249,0.38)'} />
        <path d="M10 6h11M10 12h11M10 18h11"
          stroke={active ? '#FAFAF9' : 'rgba(250,250,249,0.38)'} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

const desktopNav = [
  { href: '/home', label: 'Feed' },
  { href: '/planning', label: 'Planificación' },
  { href: '/sessions', label: 'Sesiones' },
  { href: '/analytics', label: 'Análisis' },
  { href: '/sessions/new', label: 'Nueva sesión' },
  { href: '/profile', label: 'Perfil' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (href: string) =>
    location.pathname === href ||
    (href === '/sessions' && location.pathname.startsWith('/sessions') && location.pathname !== '/sessions/new') ||
    (href === '/analytics' && location.pathname === '/analytics');

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 flex-col z-50"
        style={{ background: '#050505', borderRight: '1px solid rgba(250,250,249,0.09)' }}>
        <div className="p-6 pb-4">
          <Link to="/home" className="flex items-center gap-2">
            <span style={{
              fontFamily: "'Urbanist', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              color: '#FAFAF9',
            }}>ASCEND</span>
          </Link>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'rgba(250,250,249,0.38)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}>Climb Tracker</div>
        </div>

        <div style={{ height: 1, background: 'rgba(250,250,249,0.09)', margin: '0 24px' }} />

        <nav className="flex-1 px-4 py-4 space-y-1">
          {desktopNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  fontFamily: "'Urbanist', sans-serif",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#FAFAF9' : 'rgba(250,250,249,0.55)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  borderLeft: active ? '2px solid #E23A1F' : '2px solid transparent',
                  paddingLeft: active ? 10 : 12,
                  transition: 'all 0.15s',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(250,250,249,0.09)' }}>
          <button
            onClick={handleSignOut}
            style={{
              background: 'transparent',
              border: '1px solid rgba(250,250,249,0.18)',
              color: 'rgba(250,250,249,0.55)',
              padding: '10px 16px',
              width: '100%',
              fontFamily: "'Urbanist', sans-serif",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-5"
        style={{
          background: 'rgba(5,5,5,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(250,250,249,0.09)',
        }}
      >
        <Link to="/home" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: "'Urbanist', sans-serif",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: '#FAFAF9',
          }}>ASCEND</span>
        </Link>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'rgba(250,250,249,0.38)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>Climb Tracker</div>
      </header>

      {/* Main Content */}
      <main className="md:ml-56 pt-14 md:pt-0 min-h-screen">
        <div className="pb-24 md:pb-8 max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav — Strava-style */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center"
        style={{
          background: 'rgba(5,5,5,0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(250,250,249,0.09)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          paddingTop: 10,
          height: 72,
        }}
      >
        {mainTabs.map((tab) => {
          const active = isActive(tab.href);

          if (tab.isAction) {
            return (
              <Link
                key={tab.href}
                to={tab.href}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#FAFAF9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 6px rgba(5,5,5,0.94)',
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                {tab.icon(false)}
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              to={tab.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                position: 'relative',
                minWidth: 52,
                textDecoration: 'none',
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 2,
                  background: '#FAFAF9',
                }} />
              )}
              {tab.icon(active)}
              {tab.label && (
                <span style={{
                  fontFamily: "'Urbanist', sans-serif",
                  fontSize: 9,
                  color: active ? '#FAFAF9' : 'rgba(250,250,249,0.38)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  fontWeight: active ? 600 : 500,
                }}>
                  {tab.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
