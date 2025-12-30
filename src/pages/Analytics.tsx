import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mountain, Footprints, TrendingUp, Timer, Target } from 'lucide-react';
import ActivityDonutChart from '@/components/analytics/ActivityDonutChart';
import WeeklyStackedBarChart from '@/components/analytics/WeeklyStackedBarChart';
import ClimbDashboard from '@/components/dashboard/ClimbDashboard';
import RunningDashboard from '@/components/dashboard/RunningDashboard';
import TrainingAssistant from '@/components/dashboard/TrainingAssistant';
import MonthlyComparison from '@/components/dashboard/MonthlyComparison';
import { SessionData, Modality } from '@/utils/metricsUtils';
import { cn } from '@/lib/utils';

type TimePeriod = '7d' | '4w' | '12w' | '1y';

const PERIOD_DAYS: Record<TimePeriod, number> = {
  '7d': 7,
  '4w': 28,
  '12w': 84,
  '1y': 365,
};

export default function Analytics() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'climb' | 'running'>('overview');
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

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        {/* Header with period filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm">Seguimiento de tu progreso</p>
          </div>
          
          {/* Period Filter Tabs - like the reference */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
            {(['7d', '4w', '12w', '1y'] as TimePeriod[]).map((period) => (
              <Button
                key={period}
                variant="ghost"
                size="sm"
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-all',
                  timePeriod === period 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setTimePeriod(period)}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="climb" className="text-xs sm:text-sm">
              <Mountain className="h-4 w-4 mr-1.5" />
              Climb
            </TabsTrigger>
            <TabsTrigger value="running" className="text-xs sm:text-sm">
              <Footprints className="h-4 w-4 mr-1.5" />
              Running
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - New design */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-64 bg-muted rounded-lg" />
                <div className="h-48 bg-muted rounded-lg" />
              </div>
            ) : (
              <>
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  <Card className="card-elevated">
                    <CardContent className="p-2 sm:p-3 text-center">
                      <div className="text-lg sm:text-2xl font-bold text-primary">{stats.sessions}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Sesiones</div>
                    </CardContent>
                  </Card>
                  <Card className="card-elevated">
                    <CardContent className="p-2 sm:p-3 text-center">
                      <div className="text-lg sm:text-2xl font-bold">{stats.hours}h</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Tiempo</div>
                    </CardContent>
                  </Card>
                  <Card className="card-elevated">
                    <CardContent className="p-2 sm:p-3 text-center">
                      <div className="text-lg sm:text-2xl font-bold text-accent">{stats.climbs}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Climbs</div>
                    </CardContent>
                  </Card>
                  <Card className="card-elevated">
                    <CardContent className="p-2 sm:p-3 text-center">
                      <div className="text-lg sm:text-2xl font-bold text-cyan-500">{stats.km}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Km</div>
                    </CardContent>
                  </Card>
                  <Card className="card-elevated">
                    <CardContent className="p-2 sm:p-3 text-center">
                      <div className="text-lg sm:text-2xl font-bold">{stats.avgRpe}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">RPE</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Activity Donut Chart */}
                <ActivityDonutChart sessions={sessions} periodDays={periodDays} />

                {/* Weekly Stacked Bar Chart */}
                <WeeklyStackedBarChart sessions={sessions} periodDays={periodDays} />

                {/* Training Assistant */}
                <TrainingAssistant 
                  sessions={sessions}
                  weeklyKmGoal={weeklyKmGoal}
                  activeTab="climb"
                  modality={modality}
                />

                {/* Monthly Comparison */}
                <MonthlyComparison sessions={sessions} weeklyKmGoal={weeklyKmGoal} />
              </>
            )}
          </TabsContent>

          {/* Climb Tab */}
          <TabsContent value="climb" className="mt-6">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-muted rounded-lg" />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="h-64 bg-muted rounded-lg" />
                  <div className="h-64 bg-muted rounded-lg" />
                </div>
              </div>
            ) : (
              <ClimbDashboard sessions={sessions} />
            )}
          </TabsContent>

          {/* Running Tab */}
          <TabsContent value="running" className="mt-6">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-muted rounded-lg" />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="h-64 bg-muted rounded-lg" />
                  <div className="h-64 bg-muted rounded-lg" />
                </div>
              </div>
            ) : (
              <RunningDashboard sessions={sessions} weeklyKmGoal={weeklyKmGoal} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
