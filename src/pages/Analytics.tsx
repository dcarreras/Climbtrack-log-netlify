import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import ActivityDonutChart from '@/components/analytics/ActivityDonutChart';
import WeeklyStackedBarChart from '@/components/analytics/WeeklyStackedBarChart';
import ClimbDashboard from '@/components/dashboard/ClimbDashboard';
import RunningDashboard from '@/components/dashboard/RunningDashboard';
import BikeDashboard from '@/components/dashboard/BikeDashboard';
import StrengthDashboard from '@/components/dashboard/StrengthDashboard';
import TrainingAssistant from '@/components/dashboard/TrainingAssistant';
import MonthlyComparison from '@/components/dashboard/MonthlyComparison';
import { SessionData, Modality } from '@/utils/metricsUtils';

type TimePeriod = '7d' | '4w' | '12w' | '1y';

const PERIOD_DAYS: Record<TimePeriod, number> = {
  '7d': 7,
  '4w': 28,
  '12w': 84,
  '1y': 365,
};

export default function Analytics() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'climb' | 'running' | 'bike' | 'strength'>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('4w');
  const [modality, setModality] = useState<Modality>('boulder');

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('weekly_running_km_goal')
        .eq('id', user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['analytics-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, gyms(name), climbs(*)')
        .eq('user_id', user!.id)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as SessionData[];
    },
    enabled: !!user,
  });

  const weeklyKmGoal = Number(profile?.weekly_running_km_goal) || 20;
  const periodDays = PERIOD_DAYS[timePeriod];

  // Calculate quick stats for the selected period
  const stats = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const filtered = sessions.filter(s => new Date(s.date) >= startDate);
    
    const totalSessions = filtered.length;
    const totalDuration = filtered.reduce((sum, s) => sum + (s.duration_min || s.time_min || 0), 0);
    const totalClimbs = filtered.reduce((sum, s) => sum + (s.climbs?.length || 0), 0);
    const totalKm = filtered.reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0);
    const avgRpe = filtered.filter(s => s.rpe_1_10).length > 0
      ? (filtered.reduce((sum, s) => sum + (s.rpe_1_10 || 0), 0) / filtered.filter(s => s.rpe_1_10).length).toFixed(1)
      : '-';

    return {
      sessions: totalSessions,
      hours: Math.round(totalDuration / 60 * 10) / 10,
      climbs: totalClimbs,
      km: Math.round(totalKm * 10) / 10,
      avgRpe,
    };
  }, [sessions, periodDays]);

  const T = {
    bg: '#050505', ink: '#FAFAF9', inkFaint: 'rgba(250,250,249,0.38)',
    inkDim: 'rgba(250,250,249,0.16)', rule: 'rgba(250,250,249,0.09)',
    sans: "'Urbanist', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', monospace",
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'climb', label: 'Escalada' },
    { id: 'running', label: 'Running' },
    { id: 'bike', label: 'Bici' },
    { id: 'strength', label: 'Fuerza' },
  ] as const;

  return (
    <AppLayout>
      <div style={{ background: T.bg, minHeight: '100vh', paddingBottom: 100 }}>
        {/* Header */}
        <div style={{ padding: '28px 20px 0' }}>
          <div style={{ fontFamily: T.sans, fontSize: 10, color: T.inkFaint,
            textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: 10 }}>
            Tendencias
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 42, color: T.ink, lineHeight: 0.95,
            fontWeight: 700, letterSpacing: '-0.025em', textTransform: 'uppercase' }}>
            Análisis
          </div>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', borderTop: `1px solid ${T.rule}`,
          borderBottom: `1px solid ${T.rule}`, marginTop: 20 }}>
          {(['7d', '4w', '12w', '1y'] as TimePeriod[]).map(p => (
            <button key={p} onClick={() => setTimePeriod(p)} style={{
              flex: 1, padding: '12px 0', background: 'none', border: 'none',
              borderRight: p !== '1y' ? `1px solid ${T.rule}` : 'none',
              fontFamily: T.mono, fontSize: 11, cursor: 'pointer',
              color: timePeriod === p ? T.ink : T.inkFaint,
              fontWeight: timePeriod === p ? 600 : 400,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              borderBottom: timePeriod === p ? '2px solid #FAFAF9' : '2px solid transparent',
            }}>{p}</button>
          ))}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: `1px solid ${T.rule}` }}>
          {[
            { value: stats.sessions, label: 'Ses.' },
            { value: `${stats.hours}h`, label: 'Tiempo' },
            { value: stats.climbs, label: 'Vías' },
            { value: `${stats.km}`, label: 'km' },
            { value: stats.avgRpe, label: 'RPE' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '14px 12px',
              borderRight: i < 4 ? `1px solid ${T.rule}` : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: T.sans, fontSize: 22, color: T.ink,
                fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {s.value}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
                textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: 5 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar — scrollable for 5 tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.rule}`,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex: '0 0 auto', padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: T.sans, fontSize: 11,
              color: activeTab === t.id ? T.ink : T.inkFaint,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              fontWeight: activeTab === t.id ? 600 : 500,
              position: 'relative', whiteSpace: 'nowrap',
            }}>
              {t.label}
              {activeTab === t.id && (
                <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0,
                  height: 1, background: T.ink }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '0 0 24px' }}>
          {isLoading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center',
              fontFamily: T.sans, fontSize: 13, color: T.inkFaint }}>Cargando…</div>
          ) : activeTab === 'overview' ? (
            <div style={{ padding: '20px 20px 0' }}>
              <ActivityDonutChart sessions={sessions} periodDays={periodDays} />
              <div style={{ marginTop: 24 }}>
                <WeeklyStackedBarChart sessions={sessions} periodDays={periodDays} />
              </div>
              <div style={{ marginTop: 24 }}>
                <TrainingAssistant sessions={sessions} weeklyKmGoal={weeklyKmGoal} activeTab="climb" modality={modality} />
              </div>
              <div style={{ marginTop: 24 }}>
                <MonthlyComparison sessions={sessions} weeklyKmGoal={weeklyKmGoal} />
              </div>
            </div>
          ) : activeTab === 'climb' ? (
            <div style={{ padding: '20px 20px 0' }}>
              <ClimbDashboard sessions={sessions} />
            </div>
          ) : activeTab === 'running' ? (
            <div style={{ padding: '20px 20px 0' }}>
              <RunningDashboard sessions={sessions} weeklyKmGoal={weeklyKmGoal} />
            </div>
          ) : activeTab === 'bike' ? (
            <div style={{ padding: '20px 20px 0' }}>
              <BikeDashboard sessions={sessions} />
            </div>
          ) : (
            <div style={{ padding: '20px 20px 0' }}>
              <StrengthDashboard sessions={sessions} />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
