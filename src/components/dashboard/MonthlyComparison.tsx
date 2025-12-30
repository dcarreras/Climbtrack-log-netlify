import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, Legend, ComposedChart
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus, Mountain, Footprints } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { SessionData, Modality, filterClimbsByModality } from '@/utils/metricsUtils';
import { boulderColorToIndex, frenchGradeToIndex, getBoulderDisplayLabel, indexToBoulderColor, indexToFrenchGrade } from '@/utils/gradeUtils';

interface MonthlyComparisonProps {
  sessions: SessionData[];
  weeklyKmGoal: number;
}

interface MonthlyClimbData {
  month: string;
  monthDate: Date;
  // Boulder
  boulderMaxSent: number;
  boulderMaxSentLabel: string;
  boulderAttempts: number;
  boulderSends: number;
  boulderFlashes: number;
  // Route
  routeMaxSent: number;
  routeMaxSentLabel: string;
  routeAttempts: number;
  routeSends: number;
  // Sessions
  climbSessions: number;
  totalClimbTime: number;
}

interface MonthlyRunningData {
  month: string;
  monthDate: Date;
  totalKm: number;
  totalTime: number;
  totalElevation: number;
  sessions: number;
  avgPace: number; // min/km
  goalAchievedWeeks: number;
}

export default function MonthlyComparison({ sessions, weeklyKmGoal }: MonthlyComparisonProps) {
  const monthlyClimbData = useMemo(() => {
    const now = new Date();
    const months: MonthlyClimbData[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthSessions = sessions.filter(s => {
        const date = parseISO(s.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });
      
      const climbingSessions = monthSessions.filter(s => 
        s.session_type === 'boulder' || s.session_type === 'rope' || s.session_type === 'hybrid'
      );
      
      // Boulder metrics
      const boulderClimbs = climbingSessions.flatMap(s => 
        filterClimbsByModality(s.climbs || [], 'boulder')
      );
      const boulderSent = boulderClimbs.filter(c => c.sent);
      const boulderIndices = boulderSent.map(c => boulderColorToIndex(c.color_band)).filter(i => i > 0);
      const boulderMaxSent = boulderIndices.length > 0 ? Math.max(...boulderIndices) : 0;
      
      // Route metrics
      const routeClimbs = climbingSessions.flatMap(s => 
        filterClimbsByModality(s.climbs || [], 'rope')
      );
      const routeSent = routeClimbs.filter(c => c.sent);
      const routeIndices = routeSent.map(c => frenchGradeToIndex(c.grade_value)).filter(i => i > 0);
      const routeMaxSent = routeIndices.length > 0 ? Math.max(...routeIndices) : 0;
      
      months.push({
        month: format(monthStart, 'MMM', { locale: es }),
        monthDate: monthStart,
        boulderMaxSent,
        boulderMaxSentLabel: boulderMaxSent > 0 
          ? getBoulderDisplayLabel(indexToBoulderColor(boulderMaxSent)) 
          : '-',
        boulderAttempts: boulderClimbs.reduce((sum, c) => sum + c.attempts, 0),
        boulderSends: boulderSent.length,
        boulderFlashes: boulderClimbs.filter(c => c.flash).length,
        routeMaxSent,
        routeMaxSentLabel: routeMaxSent > 0 ? indexToFrenchGrade(routeMaxSent) || '-' : '-',
        routeAttempts: routeClimbs.reduce((sum, c) => sum + c.attempts, 0),
        routeSends: routeSent.length,
        climbSessions: climbingSessions.length,
        totalClimbTime: climbingSessions.reduce((sum, s) => sum + (s.duration_min || 0), 0),
      });
    }
    
    return months;
  }, [sessions]);

  const monthlyRunningData = useMemo(() => {
    const now = new Date();
    const months: MonthlyRunningData[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const runningSessions = sessions.filter(s => {
        const date = parseISO(s.date);
        return s.session_type === 'running' && isWithinInterval(date, { start: monthStart, end: monthEnd });
      });
      
      const totalKm = runningSessions.reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0);
      const totalTime = runningSessions.reduce((sum, s) => sum + (s.duration_min || s.time_min || 0), 0);
      const totalElevation = runningSessions.reduce((sum, s) => sum + (Number(s.elevation_gain_m) || 0), 0);
      
      months.push({
        month: format(monthStart, 'MMM', { locale: es }),
        monthDate: monthStart,
        totalKm: Number(totalKm.toFixed(1)),
        totalTime,
        totalElevation: Math.round(totalElevation),
        sessions: runningSessions.length,
        avgPace: totalKm > 0 ? totalTime / totalKm : 0,
        goalAchievedWeeks: 0, // Could calculate properly
      });
    }
    
    return months;
  }, [sessions]);

  const getTrend = (current: number, previous: number) => {
    if (current > previous) return { icon: <TrendingUp className="h-4 w-4 text-success" />, text: 'Subiendo' };
    if (current < previous) return { icon: <TrendingDown className="h-4 w-4 text-destructive" />, text: 'Bajando' };
    return { icon: <Minus className="h-4 w-4 text-muted-foreground" />, text: 'Estable' };
  };

  const currentMonth = monthlyClimbData[monthlyClimbData.length - 1];
  const previousMonth = monthlyClimbData[monthlyClimbData.length - 2];
  const currentRunning = monthlyRunningData[monthlyRunningData.length - 1];
  const previousRunning = monthlyRunningData[monthlyRunningData.length - 2];

  const boulderTrend = getTrend(currentMonth?.boulderMaxSent || 0, previousMonth?.boulderMaxSent || 0);
  const routeTrend = getTrend(currentMonth?.routeMaxSent || 0, previousMonth?.routeMaxSent || 0);
  const runningTrend = getTrend(currentRunning?.totalKm || 0, previousRunning?.totalKm || 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Comparativa Mensual</h3>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Mountain className="h-4 w-4" /> Boulder Max
              </span>
              <Badge variant="outline" className="text-xs">
                {boulderTrend.icon}
              </Badge>
            </div>
            <div className="text-2xl font-bold">{currentMonth?.boulderMaxSentLabel || '-'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              vs {previousMonth?.boulderMaxSentLabel || '-'} mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Cuerda Max</span>
              <Badge variant="outline" className="text-xs">
                {routeTrend.icon}
              </Badge>
            </div>
            <div className="text-2xl font-bold">{currentMonth?.routeMaxSentLabel || '-'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              vs {previousMonth?.routeMaxSentLabel || '-'} mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Footprints className="h-4 w-4" /> Running
              </span>
              <Badge variant="outline" className="text-xs">
                {runningTrend.icon}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-cyan-500">{currentRunning?.totalKm || 0} km</div>
            <p className="text-xs text-muted-foreground mt-1">
              vs {previousRunning?.totalKm || 0} km mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Climb Progression */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mountain className="h-5 w-5 text-primary" />
              Progresión Escalada (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthlyClimbData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  domain={[0, 7]}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="boulderMaxSent" 
                  name="Boulder Max"
                  stroke="hsl(142, 76%, 45%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142, 76%, 45%)' }}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="boulderSends" 
                  name="Tops" 
                  fill="hsl(173, 80%, 45%)" 
                  radius={[4, 4, 0, 0]} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Running Progression */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Footprints className="h-5 w-5 text-cyan-500" />
              Progresión Running (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthlyRunningData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickFormatter={(v) => `${v}km`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickFormatter={(v) => `${v}m`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="totalKm" 
                  name="Km" 
                  fill="hsl(199, 89%, 48%)" 
                  radius={[4, 4, 0, 0]} 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="totalElevation" 
                  name="D+ (m)"
                  stroke="hsl(25, 95%, 53%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(25, 95%, 53%)' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base">Resumen por Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2">Mes</th>
                  <th className="text-center py-2 px-2">Boulder Max</th>
                  <th className="text-center py-2 px-2">Tops</th>
                  <th className="text-center py-2 px-2">Cuerda Max</th>
                  <th className="text-center py-2 px-2">Running Km</th>
                  <th className="text-center py-2 px-2">D+</th>
                </tr>
              </thead>
              <tbody>
                {monthlyClimbData.map((climb, i) => {
                  const running = monthlyRunningData[i];
                  return (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-2 font-medium">{climb.month}</td>
                      <td className="text-center py-2 px-2">{climb.boulderMaxSentLabel}</td>
                      <td className="text-center py-2 px-2">{climb.boulderSends}</td>
                      <td className="text-center py-2 px-2">{climb.routeMaxSentLabel}</td>
                      <td className="text-center py-2 px-2 text-cyan-500 font-medium">{running.totalKm}</td>
                      <td className="text-center py-2 px-2">{running.totalElevation} m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
