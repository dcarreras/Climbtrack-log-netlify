import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionData } from '@/utils/metricsUtils';
import { startOfWeek, endOfWeek, subWeeks, parseISO, isWithinInterval, format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeeklyStackedBarChartProps {
  sessions: SessionData[];
  periodDays: number;
}

// Activity type colors matching the donut chart
const ACTIVITY_COLORS: Record<string, string> = {
  boulder: 'hsl(25, 95%, 53%)',
  rope: 'hsl(280, 70%, 50%)',
  hybrid: 'hsl(320, 70%, 55%)',
  running: 'hsl(199, 89%, 48%)',
  strength: 'hsl(142, 76%, 45%)',
  hangboard: 'hsl(45, 93%, 47%)',
  flexibility: 'hsl(173, 80%, 45%)',
  other: 'hsl(215, 20%, 45%)',
};

const ACTIVITY_LABELS: Record<string, string> = {
  boulder: 'Boulder',
  rope: 'Cuerda',
  hybrid: 'Híbrido',
  running: 'Running',
  strength: 'Fuerza',
  hangboard: 'Hangboard',
  flexibility: 'Flexibilidad',
  other: 'Otro',
};

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function WeeklyStackedBarChart({ sessions, periodDays }: WeeklyStackedBarChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const weeksBack = Math.ceil(periodDays / 7);
    
    // Get all activity types that exist in the data
    const allTypes = new Set<string>();
    sessions.forEach(s => allTypes.add(s.session_type || 'other'));
    const activityTypes = Array.from(allTypes);

    // Calculate weekly totals
    const weeklyData: { week: string; total: number; [key: string]: number | string }[] = [];
    
    for (let i = weeksBack - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      
      const weekSessions = sessions.filter(s => {
        const sessionDate = parseISO(s.date);
        return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
      });
      
      const weekLabel = format(weekStart, 'd MMM', { locale: es });
      const weekData: Record<string, number> = {};
      
      activityTypes.forEach(type => {
        const typeSessions = weekSessions.filter(s => (s.session_type || 'other') === type);
        const totalMinutes = typeSessions.reduce((sum, s) => sum + (s.duration_min || s.time_min || 0), 0);
        weekData[type] = Math.round(totalMinutes / 60 * 10) / 10; // Convert to hours
      });
      
      const total = Object.values(weekData).reduce((a, b) => a + b, 0);
      
      weeklyData.push({
        week: weekLabel,
        total,
        ...weekData,
      });
    }
    
    // Calculate average hours per week
    const totalHours = weeklyData.reduce((sum, w) => sum + (w.total as number), 0);
    const avgHoursPerWeek = Math.round(totalHours / weeksBack * 10) / 10;
    
    return {
      weeklyData,
      activityTypes,
      avgHoursPerWeek,
    };
  }, [sessions, periodDays]);

  // Daily breakdown for current week
  const dailyData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const allTypes = new Set<string>();
    sessions.forEach(s => allTypes.add(s.session_type || 'other'));
    const activityTypes = Array.from(allTypes);
    
    return days.map((day, index) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySessions = sessions.filter(s => s.date === dayStr);
      
      const dayData: Record<string, number> = {};
      activityTypes.forEach(type => {
        const typeSessions = daySessions.filter(s => (s.session_type || 'other') === type);
        const totalMinutes = typeSessions.reduce((sum, s) => sum + (s.duration_min || s.time_min || 0), 0);
        dayData[type] = Math.round(totalMinutes / 60 * 10) / 10;
      });
      
      return {
        day: DAY_LABELS[index],
        ...dayData,
      };
    });
  }, [sessions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.filter((p: any) => p.value > 0).map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{ACTIVITY_LABELS[entry.dataKey] || entry.dataKey}:</span>
              <span className="font-medium">{entry.value}h</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Weekly Hours Average */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{data.avgHoursPerWeek}</span>
            <span className="text-muted-foreground">horas / semana</span>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="w-full overflow-x-auto">
            <div className="min-w-[300px]">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.weeklyData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <XAxis 
                    dataKey="week" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    width={30}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  {data.activityTypes.map((type) => (
                    <Bar
                      key={type}
                      dataKey={type}
                      stackId="a"
                      fill={ACTIVITY_COLORS[type] || ACTIVITY_COLORS.other}
                      radius={[0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {data.activityTypes.map((type) => (
              <div key={type} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: ACTIVITY_COLORS[type] || ACTIVITY_COLORS.other }}
                />
                <span className="text-muted-foreground">{ACTIVITY_LABELS[type] || type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Week Daily Breakdown */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Esta semana</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="w-full overflow-x-auto">
            <div className="min-w-[280px]">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dailyData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <XAxis 
                    dataKey="day" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  {data.activityTypes.map((type) => (
                    <Bar
                      key={type}
                      dataKey={type}
                      stackId="a"
                      fill={ACTIVITY_COLORS[type] || ACTIVITY_COLORS.other}
                      radius={[2, 2, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
