import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { eachDayOfInterval, endOfWeek, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionData } from '@/utils/metricsUtils';

interface WeeklyStackedBarChartProps {
  periodDays: number;
  sessions: SessionData[];
}

const CLIMB_SESSION_TYPES = new Set(['boulder', 'rope', 'hybrid']);
const CATEGORY_ORDER = ['climb', 'running', 'bike', 'strength'] as const;
type ActivityCategory = (typeof CATEGORY_ORDER)[number];

const ACTIVITY_COLORS: Record<ActivityCategory, string> = {
  bike: 'rgba(245,245,244,0.26)',
  climb: '#f5f5f4',
  running: 'rgba(245,245,244,0.62)',
  strength: 'rgba(245,245,244,0.42)',
};

const ACTIVITY_LABELS: Record<ActivityCategory, string> = {
  bike: 'Bici',
  climb: 'Escalada',
  running: 'Running',
  strength: 'Fuerza',
};

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface TooltipPayloadEntry {
  color?: string;
  dataKey?: string;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadEntry[];
}

function getActivityCategory(sessionType: string): ActivityCategory | null {
  if (CLIMB_SESSION_TYPES.has(sessionType)) return 'climb';
  if (sessionType === 'running') return 'running';
  if (sessionType === 'bike') return 'bike';
  if (sessionType === 'training') return 'strength';
  return null;
}

function formatDay(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default function WeeklyStackedBarChart({
  periodDays,
  sessions,
}: WeeklyStackedBarChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const weeksBack = Math.min(12, Math.ceil(periodDays / 7));
    const weeklyData: { week: string; total: number; [key: string]: number | string }[] = [];

    for (let i = weeksBack - 1; i >= 0; i -= 1) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const bucketTotals: Record<ActivityCategory, number> = {
        bike: 0,
        climb: 0,
        running: 0,
        strength: 0,
      };

      sessions.forEach((session) => {
        const category = getActivityCategory(session.session_type || '');
        if (!category) return;

        const sessionDate = parseISO(session.date);
        if (sessionDate < weekStart || sessionDate > weekEnd) return;

        bucketTotals[category] += Math.round(((session.duration_min || session.time_min || 0) / 60) * 10) / 10;
      });

      const total = CATEGORY_ORDER.reduce((sum, category) => sum + bucketTotals[category], 0);

      weeklyData.push({
        week: `W${weeksBack - i}`,
        total,
        ...bucketTotals,
      });
    }

    const totalHours = weeklyData.reduce((sum, week) => sum + Number(week.total || 0), 0);
    const avgHoursPerWeek = Math.round((totalHours / Math.max(weeksBack, 1)) * 10) / 10;
    const totals = CATEGORY_ORDER.reduce(
      (accumulator, category) => ({
        ...accumulator,
        [category]:
          Math.round(
            weeklyData.reduce((sum, week) => sum + Number(week[category] || 0), 0) * 10,
          ) / 10,
      }),
      {} as Record<ActivityCategory, number>,
    );

    return {
      avgHoursPerWeek,
      totals,
      weeklyData,
    };
  }, [periodDays, sessions]);

  const dailyData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day, index) => {
      const bucketTotals: Record<ActivityCategory, number> = {
        bike: 0,
        climb: 0,
        running: 0,
        strength: 0,
      };

      sessions.forEach((session) => {
        const category = getActivityCategory(session.session_type || '');
        if (!category) return;
        if (session.date !== formatDay(day)) return;

        bucketTotals[category] += Math.round(((session.duration_min || session.time_min || 0) / 60) * 10) / 10;
      });

      return {
        day: DAY_LABELS[index],
        ...bucketTotals,
      };
    });
  }, [sessions]);

  const CustomTooltip = ({ active, label, payload }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-lg border border-white/10 bg-[#111111] p-3 shadow-lg">
        <p className="mb-2 font-semibold text-white">{label}</p>
        {payload
          .filter((entry) => (entry.value || 0) > 0)
          .map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-white/52">
                {ACTIVITY_LABELS[entry.dataKey as ActivityCategory] || entry.dataKey}:
              </span>
              <span className="font-medium text-white">{entry.value}h</span>
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="card-elevated border-white/10 bg-[#050505]">
        <CardHeader className="pb-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/42">Volumen semanal</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{data.avgHoursPerWeek}</span>
            <span className="text-white/42">horas / semana</span>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="w-full overflow-x-auto">
            <div className="min-w-[320px]">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.weeklyData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <XAxis
                    dataKey="week"
                    stroke="rgba(250,250,249,0.38)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="rgba(250,250,249,0.24)"
                    fontSize={11}
                    width={30}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(250,250,249,0.05)' }} />
                  {CATEGORY_ORDER.map((type) => (
                    <Bar key={type} dataKey={type} stackId="weekly" fill={ACTIVITY_COLORS[type]} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORY_ORDER.map((type) => (
              <div key={type} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ACTIVITY_COLORS[type] }} />
                <span className="text-white/62">{ACTIVITY_LABELS[type]}</span>
                <span className="font-mono text-white/82">{data.totals[type]}h</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated border-white/10 bg-[#050505]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-white">Esta semana</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="w-full overflow-x-auto">
            <div className="min-w-[280px]">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dailyData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    stroke="rgba(250,250,249,0.38)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(250,250,249,0.05)' }} />
                  {CATEGORY_ORDER.map((type) => (
                    <Bar key={type} dataKey={type} stackId="daily" fill={ACTIVITY_COLORS[type]} radius={[2, 2, 0, 0]} />
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
