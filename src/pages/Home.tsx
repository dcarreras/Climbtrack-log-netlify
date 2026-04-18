import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import WeeklyCalendar from '@/components/dashboard/WeeklyCalendar';
import { SessionData } from '@/utils/metricsUtils';

type TimePeriod = '7d' | '4w' | '12w';
type SessionWithRelations = SessionData & {
  isFromStrava: boolean;
  gyms?: { name: string } | null;
};

const PERIOD_DAYS: Record<TimePeriod, number> = { '7d': 7, '4w': 28, '12w': 84 };
const CLIMB_TYPES = new Set(['boulder', 'rope', 'hybrid']);

function isHighClimbLoad(s: SessionWithRelations) {
  return (s.climbs?.reduce((t, c) => t + (c.attempts || 1), 0) || 0) >= 18
    || (s.duration_min || 0) >= 120
    || (s.rpe_1_10 || 0) >= 7;
}

function isHighRunningLoad(s: SessionWithRelations) {
  return Number(s.distance_km) >= 10
    || (s.duration_min || s.time_min || 0) >= 75
    || Number(s.elevation_gain_m) >= 450
    || (s.rpe_1_10 || 0) >= 7;
}

const T = {
  bg: '#050505',
  bgCard: '#131313',
  ink: '#FAFAF9',
  inkMuted: 'rgba(250,250,249,0.62)',
  inkFaint: 'rgba(250,250,249,0.38)',
  inkDim: 'rgba(250,250,249,0.16)',
  rule: 'rgba(250,250,249,0.09)',
  ruleStrong: 'rgba(250,250,249,0.18)',
  accent: '#E23A1F',
  accentDim: 'rgba(226,58,31,0.18)',
  sans: "'Urbanist', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

function Kicker({ children, num }: { children: React.ReactNode; num?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: T.sans, fontSize: 10, color: T.inkFaint,
      textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 500 }}>
      {num !== undefined && (
        <span style={{ fontFamily: T.mono, color: T.inkDim }}>
          {String(num).padStart(2, '0')}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

function StatBlock({ value, unit, label }: { value: string | number; unit?: string; label: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4,
        fontFamily: T.sans, fontSize: 42, fontWeight: 700,
        letterSpacing: '-0.04em', color: T.ink, lineHeight: 0.9 }}>
        <span>{value}</span>
        {unit && <span style={{ fontSize: 14, color: T.inkFaint, fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>{unit}</span>}
      </div>
      <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
        textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 8, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: SessionWithRelations }) {
  const isClimb = CLIMB_TYPES.has(session.session_type);
  const isRun = session.session_type === 'running';
  const sends = session.climbs?.filter(c => c.sent).length || 0;
  const attempts = session.climbs?.length || 0;

  const typeLabel: Record<string, string> = {
    boulder: 'B', rope: 'C', hybrid: 'H', running: 'R', hangboard: 'F', bike: 'B',
  };
  const glyph = typeLabel[session.session_type] || '·';

  return (
    <Link to={`/sessions/${session.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 0', borderBottom: `1px solid ${T.rule}`, cursor: 'pointer' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%',
          background: T.ink, color: T.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.sans, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          {glyph}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
            letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{format(new Date(session.date), 'EEE d MMM', { locale: es })}</span>
            {session.isFromStrava && (
              <span style={{ color: T.accent, fontWeight: 700 }}>· Strava</span>
            )}
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 15, color: T.ink,
            fontWeight: 500, letterSpacing: '-0.01em' }}>
            {session.gyms?.name || session.session_type}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isClimb && (
            <>
              <div style={{ fontFamily: T.sans, fontSize: 20, color: T.ink,
                fontWeight: 700, lineHeight: 1 }}>
                {sends}<span style={{ color: T.inkFaint, fontSize: 13, fontWeight: 400 }}>/{attempts}</span>
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
                letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 3 }}>
                tops
              </div>
            </>
          )}
          {isRun && (
            <>
              <div style={{ fontFamily: T.sans, fontSize: 20, color: T.ink,
                fontWeight: 700, lineHeight: 1 }}>
                {Number(session.distance_km || 0).toFixed(1)}<span style={{ color: T.inkFaint, fontSize: 11 }}> km</span>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.inkFaint, marginTop: 3 }}>
                {session.duration_min || session.time_min || 0} min
              </div>
            </>
          )}
          {!isClimb && !isRun && (
            <div style={{ fontFamily: T.mono, fontSize: 13, color: T.inkMuted }}>
              {session.duration_min || session.time_min || 0} min
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('4w');

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      const [sessionsResult, stravaResult] = await Promise.all([
        supabase.from('sessions').select('*, gyms(name), climbs(*)').eq('user_id', user!.id).order('date', { ascending: false }),
        supabase.from('strava_activities').select('synced_to_session_id').eq('user_id', user!.id).not('synced_to_session_id', 'is', null),
      ]);
      if (sessionsResult.error) throw sessionsResult.error;
      const stravaIds = new Set(stravaResult.data?.map(a => a.synced_to_session_id) || []);
      return sessionsResult.data.map(s => ({ ...s, isFromStrava: stravaIds.has(s.id) })) as SessionWithRelations[];
    },
    enabled: !!user,
  });

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Climber';
  const firstName = displayName.split(' ')[0];
  const periodDays = PERIOD_DAYS[timePeriod];
  const recentSessions = sessions.slice(0, 5);

  const summary = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const filtered = sessions.filter(s => new Date(s.date) >= cutoff);
    const climbSessions = filtered.filter(s => CLIMB_TYPES.has(s.session_type));
    const runningSessions = filtered.filter(s => s.session_type === 'running');
    const climbs = climbSessions.flatMap(s => s.climbs || []);
    const climbSends = climbs.filter(c => c.sent).length;
    const climbAttempts = climbs.reduce((t, c) => t + (c.attempts || 1), 0);
    const runningKm = runningSessions.reduce((t, s) => t + (Number(s.distance_km) || 0), 0);
    const runningMinutes = runningSessions.reduce((t, s) => t + (s.duration_min || s.time_min || 0), 0);
    const totalMinutes = filtered.reduce((t, s) => t + (s.duration_min || s.time_min || 0), 0);

    const highClimb = climbSessions.filter(isHighClimbLoad);
    const highRunning = runningSessions.filter(isHighRunningLoad);
    const hasOverlap = highClimb.some(c => highRunning.some(r =>
      Math.abs(differenceInCalendarDays(new Date(c.date), new Date(r.date))) <= 2));

    let interferenceLevel = 'Baja';
    let interferenceMessage = 'La mezcla de cargas se ve estable.';
    if (hasOverlap) {
      interferenceLevel = 'Alta';
      interferenceMessage = 'Has juntado carrera exigente y escalada dura en menos de 48h.';
    } else if (highClimb.length + highRunning.length >= 3) {
      interferenceLevel = 'Media';
      interferenceMessage = 'La carga conjunta ya es relevante.';
    }

    return { climbSends, climbAttempts, runningKm, runningMinutes, totalMinutes,
      totalSessions: filtered.length, interferenceLevel, interferenceMessage };
  }, [periodDays, sessions]);

  const today = format(new Date(), 'dd·MM·yy', { locale: es });
  const todayDay = format(new Date(), 'EEEE', { locale: es });

  return (
    <AppLayout>
      <div style={{ background: T.bg, minHeight: '100vh' }}>

        {/* Hero — image with B/W overlay */}
        <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/cochamo-bg.jpg)',
            backgroundSize: 'cover', backgroundPosition: 'center 40%',
            filter: 'grayscale(1) contrast(1.05) brightness(0.6)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(5,5,5,0.2) 0%, rgba(5,5,5,0.2) 40%, rgba(5,5,5,0.8) 82%, #050505 100%)',
          }} />

          {/* Date + avatar */}
          <div style={{ position: 'absolute', top: 16, left: 20, right: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: T.sans, fontSize: 10, color: T.ink,
              textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 500,
              textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
              <span style={{ fontFamily: T.mono, marginRight: 8 }}>{today}</span>
              · {todayDay}
            </div>
            <Link to="/profile" style={{
              width: 34, height: 34, borderRadius: '50%',
              border: '1px solid rgba(250,250,249,0.6)',
              background: 'rgba(5,5,5,0.35)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.sans, fontSize: 14, color: T.ink, fontWeight: 600,
              textDecoration: 'none',
            }}>
              {firstName[0]?.toUpperCase()}
            </Link>
          </div>

          {/* Greeting */}
          <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
            <div style={{ fontFamily: T.sans, fontSize: 9, color: T.ink,
              textTransform: 'uppercase', letterSpacing: '0.34em', fontWeight: 600,
              marginBottom: 6, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
              ASCEND<span style={{ opacity: 0.5, margin: '0 8px' }}>·</span>ÍNDICE PERSONAL
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 26, color: T.ink, lineHeight: 0.98,
              fontWeight: 300, letterSpacing: '-0.02em', textTransform: 'uppercase',
              textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              Hola, <span style={{ fontWeight: 700 }}>{firstName}</span>
            </div>
            <div style={{ marginTop: 8, paddingTop: 8,
              borderTop: '1px solid rgba(250,250,249,0.25)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: T.sans, fontSize: 9, color: 'rgba(250,250,249,0.78)',
              letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>
              <span>{summary.totalSessions} sesiones en el periodo</span>
              <span style={{ fontFamily: T.mono, color: T.ink, fontWeight: 600 }}>
                {timePeriod}
              </span>
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.rule}` }}>
          {(['7d', '4w', '12w'] as TimePeriod[]).map(p => (
            <button key={p} onClick={() => setTimePeriod(p)} style={{
              flex: 1, padding: '12px 0', background: 'none', border: 'none',
              borderRight: p !== '12w' ? `1px solid ${T.rule}` : 'none',
              fontFamily: T.mono, fontSize: 11, cursor: 'pointer',
              color: timePeriod === p ? T.ink : T.inkFaint,
              fontWeight: timePeriod === p ? 600 : 400,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              borderBottom: timePeriod === p ? `2px solid ${T.ink}` : '2px solid transparent',
            }}>{p}</button>
          ))}
        </div>

        {/* Split stats — Escalada / Running */}
        <div style={{ padding: '32px 20px 0' }}>
          <Kicker num={1}>Volumen · {timePeriod}</Kicker>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28,
            padding: '4px 0 24px', borderBottom: `1px solid ${T.rule}` }}>
            <div style={{ borderRight: `1px solid ${T.rule}`, paddingRight: 20 }}>
              <StatBlock value={summary.climbSends} unit="tops" label="Escalada" />
              <div style={{ marginTop: 10, fontFamily: T.mono, fontSize: 10, color: T.inkFaint }}>
                / {summary.climbAttempts} intentos
              </div>
            </div>
            <div>
              <StatBlock value={summary.runningKm.toFixed(1)} unit="km" label="Running" />
              <div style={{ marginTop: 10, fontFamily: T.mono, fontSize: 10, color: T.inkFaint }}>
                / {summary.runningMinutes} min
              </div>
            </div>
          </div>
        </div>

        {/* Interferencia */}
        <div style={{ padding: '32px 20px 0' }}>
          <Kicker num={2}>Interferencias</Kicker>
          <div style={{ marginTop: 16, padding: '20px', border: `1px solid ${T.rule}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                fontFamily: T.sans, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: summary.interferenceLevel === 'Alta' ? T.accent :
                  summary.interferenceLevel === 'Media' ? '#60a5fa' : '#4ade80',
              }}>
                {summary.interferenceLevel}
              </div>
              <div style={{ flex: 1, height: 1, background: T.rule }} />
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.inkFaint }}>
                {summary.totalMinutes} min · {summary.totalSessions} ses
              </div>
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 14, color: T.inkMuted, lineHeight: 1.5 }}>
              {summary.interferenceMessage}
            </div>
          </div>
        </div>

        {/* Weekly calendar */}
        <div style={{ padding: '32px 20px 0' }}>
          <Kicker num={3}>Semana</Kicker>
          <div style={{ marginTop: 16 }}>
            <WeeklyCalendar sessions={sessions} />
          </div>
        </div>

        {/* Sesiones recientes */}
        <div style={{ padding: '32px 20px 0', paddingBottom: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Kicker num={4}>Sesiones recientes</Kicker>
            <Link to="/sessions" style={{
              fontFamily: T.sans, fontSize: 10, color: T.inkMuted,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              fontWeight: 500, textDecoration: 'none',
            }}>
              Todas →
            </Link>
          </div>

          {sessionsLoading ? (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 64, borderBottom: `1px solid ${T.rule}`,
                  background: `rgba(250,250,249,0.03)`, marginBottom: 0 }} />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ marginTop: 20, padding: '40px 20px', textAlign: 'center',
              border: `1px solid ${T.rule}` }}>
              <div style={{ fontFamily: T.sans, fontSize: 15, color: T.ink, fontWeight: 600,
                marginBottom: 8 }}>Sin sesiones</div>
              <div style={{ fontFamily: T.sans, fontSize: 13, color: T.inkFaint, marginBottom: 20 }}>
                Empieza a registrar escalada y carrera.
              </div>
              <Link to="/sessions/new" style={{
                display: 'inline-block',
                background: T.ink, color: T.bg,
                padding: '12px 24px',
                fontFamily: T.sans, fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.16em',
                textDecoration: 'none',
              }}>
                + Primera sesión
              </Link>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {recentSessions.map(s => <SessionRow key={s.id} session={s} />)}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
