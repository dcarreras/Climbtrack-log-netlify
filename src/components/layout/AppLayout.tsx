import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Mountain, 
  LayoutDashboard, 
  Plus, 
  BarChart3, 
  User,
  LogOut,
  Menu,
  X,
  Timer,
  CalendarDays,
  ClipboardList,
  Image
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/home', icon: LayoutDashboard, label: 'Home' },
  { href: '/sessions', icon: ClipboardList, label: 'Sesiones' },
  { href: '/sessions/new', icon: Plus, label: 'Nueva Sesión' },
  { href: '/library', icon: Image, label: 'Biblioteca' },
  { href: '/planning', icon: CalendarDays, label: 'Planning' },
  { href: '/timer', icon: Timer, label: 'Timer' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col bg-sidebar border-r border-sidebar-border z-50">
        <div className="p-6">
          <Link to="/home" className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mountain className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display text-xl">CLIMBTRACKER</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href === '/sessions/new' && location.pathname.startsWith('/sessions'));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Link 
            to="/profile"
            className={cn(
              'flex items-center gap-3 px-4 py-2 mb-2 rounded-lg transition-all',
              location.pathname === '/profile' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-sidebar-accent'
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              location.pathname === '/profile' ? 'bg-primary-foreground/20' : 'bg-primary/20'
            )}>
              <User className={cn(
                "h-4 w-4",
                location.pathname === '/profile' ? 'text-primary-foreground' : 'text-primary'
              )} />
            </div>
            <span className="text-sm truncate">
              {user?.email}
            </span>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <Link to="/home" className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-primary" />
          <span className="font-display text-lg">CLIMBTRACKER</span>
        </Link>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-sidebar z-40 animate-fade-in">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                location.pathname === '/profile' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <User className="h-5 w-5" />
              <span className="font-medium">Perfil</span>
            </Link>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground mt-4"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="md:ml-64 pt-16 md:pt-0 min-h-screen">
        <div className="p-4 pb-24 md:p-8 md:pb-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-40">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
