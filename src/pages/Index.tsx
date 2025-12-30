import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Mountain, 
  TrendingUp, 
  Clock, 
  Target,
  BarChart3,
  Smartphone,
  Shield,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: 'Quick Logging',
    description: 'Log climbs in seconds with smart defaults and quick-add buttons.',
  },
  {
    icon: TrendingUp,
    title: 'Track Progress',
    description: 'See your grades improve over time with beautiful charts.',
  },
  {
    icon: Target,
    title: 'RPE Tracking',
    description: 'Monitor effort and recovery to optimize your training.',
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    description: 'Understand your strengths across styles, holds, and grades.',
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Designed for logging at the gym, right from your phone.',
  },
  {
    icon: Shield,
    title: 'Private & Secure',
    description: 'Your climbing data stays private and encrypted.',
  },
];

const stats = [
  { value: 'V0-V17', label: 'All Grades' },
  { value: '5', label: 'Grade Systems' },
  { value: '∞', label: 'Climbs to Log' },
];

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mountain className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display text-xl md:text-2xl">CLIMBTRACKER</span>
          </div>
          {user ? (
            <Link to="/home">
              <Button variant="default">
                Ir a Home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <div className="flex gap-3">
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-24 md:pb-32">
          <div className="max-w-3xl stagger-children">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-none mb-6">
              CLIMB
              <span className="text-gradient-primary"> SMARTER</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
              The ultimate logbook for climbers. Track your sessions, analyze your progress, 
              and crush your goals — all from your phone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto glow-primary">
                  Start Tracking Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-border/50">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 md:mt-24 grid grid-cols-3 gap-8 max-w-lg">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-3xl md:text-4xl text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative gradient orb */}
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 px-4 md:px-6 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl mb-4">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built by climbers, for climbers. Every feature designed to help you progress.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="card-elevated p-6 hover:border-primary/30 transition-all group"
              >
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:glow-primary transition-all">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disciplines Section */}
      <section className="py-20 md:py-32 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl md:text-5xl mb-6">
                BOULDER. ROPE.
                <span className="text-gradient-accent"> TRACK IT ALL.</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Whether you're crushing boulders or pushing lead grades, ClimbTracker 
                handles all disciplines with specialized tracking for each.
              </p>
              <ul className="space-y-4">
                {[
                  'Bouldering with V-Scale, Font, or gym colors',
                  'Sport climbing with French, YDS grades',
                  'Auto-belay, Top Rope, and Lead tracking',
                  'Attempts, sends, flashes, and falls',
                  'Style tags: slab, overhang, roof, crimps, slopers',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                  {['V4', 'V6', '7a', '6c+'].map((grade, i) => (
                    <div 
                      key={grade}
                      className="aspect-square rounded-xl bg-card border border-border flex items-center justify-center"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <span className="font-display text-3xl text-primary">{grade}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 p-4 rounded-xl bg-accent/90 text-accent-foreground font-semibold">
                🔥 SENT!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 px-4 md:px-6 bg-gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-6xl mb-6">
            READY TO
            <span className="text-gradient-primary"> LEVEL UP?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of climbers tracking their way to stronger sends.
            Start free, upgrade when you want.
          </p>
          <Link to="/auth">
            <Button size="lg" className="glow-primary">
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-primary" />
            <span className="font-display">CLIMBTRACKER</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 ClimbTracker. Built with ❤️ for the climbing community.
          </p>
        </div>
      </footer>
    </div>
  );
}
