import { ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bike,
  Cable,
  Dumbbell,
  Footprints,
  Layers3,
  Mountain,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { SessionData } from '@/utils/metricsUtils';
import { BOULDER_TO_FRENCH_RANGE, frenchGradeToIndex } from '@/utils/gradeUtils';

type TimePeriod = '7d' | '4w' | '12w' | '1y';
type PyramidMode = 'route' | 'boulder' | 'both';

type SessionWithRelations = SessionData & {
  description?: string | null;
  notes?: string | null;
  gyms?: { name: string } | null;
};

const PERIOD_CONFIG: Record<
  TimePeriod,
  { bucketCount: number; days: number; mode: 'day' | 'week' | 'month' }
> = {
  '7d': { bucketCount: 7, days: 7, mode: 'day' },
  '4w': { bucketCount: 4, days: 28, mode: 'week' },
  '12w': { bucketCount: 12, days: 84, mode: 'week' },
  '1y': { bucketCount: 12, days: 365, mode: 'month' },
};

const CLIMB_TYPES = new Set(['boulder', 'rope', 'hybrid']);
const ACTIVITY_ORDER = ['climb', 'running', 'bike', 'strength'] as const;
type ActivityBucket = (typeof ACTIVITY_ORDER)[number];

const ACTIVITY_LABELS: Record<ActivityBucket, string> = {
  climb: 'Escalada',
  running: 'Running',
  bike: 'Bici',
  strength: 'Fuerza',
};

const ACTIVITY_COLORS: Record<ActivityBucket, string> = {
  climb: '#F5F5F4',
  running: 'rgba(245,245,244,0.62)',
  bike: 'rgba(245,245,244,0.3)',
  strength: 'rgba(245,245,244,0.42)',
};

const SESSION_ICON_CONFIG: Record<
  string,
  { label: string; Icon: typeof Mountain; accent: string }
> = {
  boulder: { Icon: Mountain, label: 'Bloque', accent: '#F5F5F4' },
  rope: { Icon: Cable, label: 'Vías', accent: 'rgba(245,245,244,0.8)' },
  hybrid: { Icon: Layers3, label: 'Mixta', accent: 'rgba(245,245,244,0.62)' },
  running: { Icon: Footprints, label: 'Running', accent: '#FAFAF9' },
  bike: { Icon: Bike, label: 'Bici', accent: 'rgba(245,245,244,0.72)' },
  training: { Icon: Dumbbell, label: 'Fuerza', accent: 'rgba(245,245,244,0.56)' },
};

const T = {
  bg: '#050505',
  panel: '#080808',
  panelSoft: 'rgba(250,250,249,0.03)',
  ink: '#FAFAF9',
  inkMuted: 'rgba(250,250,249,0.62)',
  inkFaint: 'rgba(250,250,249,0.38)',
  inkDim: 'rgba(250,250,249,0.16)',
  rule: 'rgba(250,250,249,0.09)',
  ruleStrong: 'rgba(250,250,249,0.18)',
  accent: '#E23A1F',
  accentDim: 'rgba(226,58,31,0.18)',
};

function getActivityBucket(sessionType: string): ActivityBucket | null {
  if (CLIMB_TYPES.has(sessionType)) return 'climb';
  if (sessionType === 'running') return 'running';
  if (sessionType === 'bike') return 'bike';
  if (sessionType === 'training') return 'strength';
  return null;
}

function getSessionDuration(session: Pick<SessionWithRelations, 'duration_min' | 'time_min'>) {
  return session.duration_min || session.time_min || 0;
}

function getSessionLoad(session: SessionWithRelations) {
  const duration = getSessionDuration(session);
  const defaultRpe = CLIMB_TYPES.has(session.session_type) ? 6 : 5;
  const rpe = session.rpe_1_10 || defaultRpe;
  const distance = Number(session.distance_km) || 0;
  const distanceLoad =
    session.session_type === 'running'
      ? distance * 10
      : session.session_type === 'bike'
        ? distance * 3
        : 0;

  return duration * rpe + distanceLoad;
}

function Kicker({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]"
      style={{ color: T.inkFaint }}
    >
      {index && (
        <span className="font-mono" style={{ color: T.inkDim }}>
          {index}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

function buildSparklinePath(values: number[], width = 100, height = 34) {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function getRouteGradeLabel(climb: { grade_value?: string | null; color_band?: string | null }) {
  if (climb.grade_value) return climb.grade_value;
  if (climb.color_band) {
    const range = BOULDER_TO_FRENCH_RANGE[climb.color_band.toLowerCase() as keyof typeof BOULDER_TO_FRENCH_RANGE];
    return range?.split('–').pop()?.trim() || null;
  }
  return null;
}

function formatSessionTitle(session: SessionWithRelations) {
  const config = SESSION_ICON_CONFIG[session.session_type] || SESSION_ICON_CONFIG.training;
  return session.gyms?.name ? `${config.label} · ${session.gyms.name}` : config.label;
}

export default function Analytics() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('12w');
  const [pyramidMode, setPyramidMode] = useState<PyramidMode>('route');

  const { data: sessions = [] } = useQuery({
    queryKey: ['analytics-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, gyms(name), climbs(*)')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .order('date', { ascending: true });

      if (error) throw error;
      return data as SessionWithRelations[];
    },
    enabled: !!user,
  });

  const periodData = useMemo(() => {
    const now = new Date();
    const config = PERIOD_CONFIG[timePeriod];
    const periodStart = startOfDay(subDays(now, config.days - 1));
    const filteredSessions = sessions.filter((session) => parseISO(session.date) >= periodStart);

    const buckets = Array.from({ length: config.bucketCount }, (_, index) => {
      if (config.mode === 'day') {
        const start = startOfDay(subDays(now, config.bucketCount - 1 - index));
        return {
          key: format(start, 'yyyy-MM-dd'),
          label: format(start, 'EEE', { locale: es }).slice(0, 1).toUpperCase(),
          start,
          end: addDays(start, 1),
        };
      }

      if (config.mode === 'week') {
        const start = startOfWeek(subWeeks(now, config.bucketCount - 1 - index), { weekStartsOn: 1 });
        return {
          key: format(start, 'yyyy-MM-dd'),
          label: `W${index + 1}`,
          start,
          end: addWeeks(start, 1),
        };
      }

      const start = startOfMonth(subMonths(now, config.bucketCount - 1 - index));
      return {
        key: format(start, 'yyyy-MM-dd'),
        label: format(start, 'LLL', { locale: es }).replace('.', '').slice(0, 3),
        start,
        end: addMonths(start, 1),
      };
    });

    const volumeBuckets = buckets.map((bucket) => {
      const totals: Record<ActivityBucket, number> = {
        climb: 0,
        running: 0,
        bike: 0,
        strength: 0,
      };

      filteredSessions.forEach((session) => {
        const category = getActivityBucket(session.session_type);
        if (!category) return;
        const date = parseISO(session.date);
        if (date < bucket.start || date >= bucket.end) return;
        totals[category] += getSessionDuration(session) / 60;
      });

      const total = ACTIVITY_ORDER.reduce((sum, category) => sum + totals[category], 0);

      return {
        label: bucket.label.toUpperCase(),
        total,
        ...totals,
      };
    });

    return {
      filteredSessions,
      totals: ACTIVITY_ORDER.reduce(
        (accumulator, category) => ({
          ...accumulator,
          [category]:
            Math.round(
              volumeBuckets.reduce((sum, bucket) => sum + Number(bucket[category] || 0), 0) * 10,
            ) / 10,
        }),
        {} as Record<ActivityBucket, number>,
      ),
      volumeBuckets,
    };
  }, [sessions, timePeriod]);

  const acwrData = useMemo(() => {
    const now = new Date();
    const acuteStart = startOfDay(subDays(now, 7));
    const acuteLoad = sessions
      .filter((session) => parseISO(session.date) >= acuteStart)
      .reduce((sum, session) => sum + getSessionLoad(session), 0);

    const chronicLoads = Array.from({ length: 4 }, (_, index) => {
      const end = startOfDay(subDays(now, index * 7));
      const start = startOfDay(subDays(now, (index + 1) * 7));
      return sessions
        .filter((session) => {
          const date = parseISO(session.date);
          return date >= start && date < end;
        })
        .reduce((sum, session) => sum + getSessionLoad(session), 0);
    });

    const chronicLoad = chronicLoads.reduce((sum, value) => sum + value, 0) / 4;
    const previousAcute = chronicLoads[0] || 0;
    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
    const rampRate = previousAcute > 0 ? ((acuteLoad - previousAcute) / previousAcute) * 100 : 0;

    let label = 'Zona óptima';
    if (acwr < 0.8) label = 'Carga baja';
    else if (acwr > 1.5) label = 'Riesgo alto';
    else if (acwr > 1.3) label = 'Precaución';

    return {
      acwr,
      label,
      rampRate,
    };
  }, [sessions]);

  const consistency = useMemo(() => {
    const weeks = Array.from({ length: 12 }, (_, index) =>
      startOfWeek(subWeeks(new Date(), 11 - index), { weekStartsOn: 1 }),
    );
    const sessionCounts = sessions.reduce<Record<string, number>>((accumulator, session) => {
      accumulator[session.date] = (accumulator[session.date] || 0) + 1;
      return accumulator;
    }, {});

    const rows = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dayLabel, dayIndex) => ({
      dayLabel,
      cells: weeks.map((weekStart) => {
        const date = addDays(weekStart, dayIndex);
        const key = format(date, 'yyyy-MM-dd');
        return Math.min(sessionCounts[key] || 0, 3);
      }),
    }));

    return {
      rows,
      startLabel: format(weeks[0], "MMM d", { locale: es }),
      endLabel: format(endOfWeek(weeks[weeks.length - 1], { weekStartsOn: 1 }), "MMM d", { locale: es }),
    };
  }, [sessions]);

  const runningTrend = useMemo(() => {
    const weeklyPaces = Array.from({ length: 8 }, (_, index) => {
      const start = startOfWeek(subWeeks(new Date(), 7 - index), { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      const weekRuns = sessions.filter((session) => {
        if (session.session_type !== 'running') return false;
        const date = parseISO(session.date);
        return date >= start && date <= end;
      });

      const totalDistance = weekRuns.reduce((sum, session) => sum + (Number(session.distance_km) || 0), 0);
      const totalMinutes = weekRuns.reduce((sum, session) => sum + getSessionDuration(session), 0);
      const pace = totalDistance > 0 ? totalMinutes / totalDistance : 0;

      return {
        label: `W${index + 1}`,
        pace,
      };
    }).filter((week) => week.pace > 0);

    const averagePace =
      weeklyPaces.length > 0
        ? weeklyPaces.reduce((sum, week) => sum + week.pace, 0) / weeklyPaces.length
        : 0;

    const previousWeeks = Array.from({ length: 8 }, (_, index) => {
      const start = startOfWeek(subWeeks(new Date(), 15 - index), { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      const weekRuns = sessions.filter((session) => {
        if (session.session_type !== 'running') return false;
        const date = parseISO(session.date);
        return date >= start && date <= end;
      });

      const totalDistance = weekRuns.reduce((sum, session) => sum + (Number(session.distance_km) || 0), 0);
      const totalMinutes = weekRuns.reduce((sum, session) => sum + getSessionDuration(session), 0);
      return totalDistance > 0 ? totalMinutes / totalDistance : 0;
    }).filter(Boolean);

    const previousAverage =
      previousWeeks.length > 0 ? previousWeeks.reduce((sum, pace) => sum + pace, 0) / previousWeeks.length : 0;

    return {
      averagePace,
      delta: previousAverage > 0 ? averagePace - previousAverage : 0,
      values: weeklyPaces.map((week) => week.pace),
    };
  }, [sessions]);

  const pyramid = useMemo(() => {
    const climbs = periodData.filteredSessions.flatMap((session) => session.climbs || []);
    const filteredClimbs = climbs
      .map((climb) => {
        const isBoulder = climb.discipline === 'boulder';
        if (pyramidMode === 'route' && isBoulder) return null;
        if (pyramidMode === 'boulder' && !isBoulder) return null;
        const label = getRouteGradeLabel(climb);
        if (!label) return null;
        return {
          label,
          attempts: climb.attempts || 1,
          sent: climb.sent ? 1 : 0,
          index: frenchGradeToIndex(label),
        };
      })
      .filter((item): item is { label: string; attempts: number; sent: number; index: number } => Boolean(item) && item.index > 0);

    const grouped = filteredClimbs.reduce<Record<string, { label: string; attempts: number; sent: number; index: number }>>(
      (accumulator, climb) => {
        if (!accumulator[climb.label]) {
          accumulator[climb.label] = { ...climb };
        } else {
          accumulator[climb.label].attempts += climb.attempts;
          accumulator[climb.label].sent += climb.sent;
        }
        return accumulator;
      },
      {},
    );

    const rows = Object.values(grouped)
      .sort((left, right) => right.index - left.index)
      .slice(0, 8)
      .map((row, index) => ({
        ...row,
        ratio: row.attempts > 0 ? row.sent / row.attempts : 0,
        accent: index < 2,
      }));

    const sentTotal = rows.reduce((sum, row) => sum + row.sent, 0);
    const attemptsTotal = rows.reduce((sum, row) => sum + row.attempts, 0);

    return {
      rows,
      sentTotal,
      attemptsTotal,
      ratio: attemptsTotal > 0 ? (sentTotal / attemptsTotal) * 100 : 0,
      scaleLabel:
        pyramidMode === 'boulder' ? 'Escala aprox.' : pyramidMode === 'route' ? 'Escala francesa' : 'Escala combinada',
    };
  }, [periodData.filteredSessions, pyramidMode]);

  const observation = useMemo(() => {
    const currentStart = startOfDay(subDays(new Date(), 27));
    const previousStart = startOfDay(subDays(new Date(), 55));
    const previousEnd = startOfDay(subDays(new Date(), 28));

    const collect = (from: Date, to: Date) =>
      sessions
        .filter((session) => {
          const date = parseISO(session.date);
          return date >= from && date <= to;
        })
        .flatMap((session) => session.climbs || [])
        .map((climb) => {
          const isBoulder = climb.discipline === 'boulder';
          if (pyramidMode === 'route' && isBoulder) return null;
          if (pyramidMode === 'boulder' && !isBoulder) return null;
          return climb;
        })
        .filter(Boolean);

    const currentClimbs = collect(currentStart, new Date());
    const previousClimbs = collect(previousStart, previousEnd);

    const currentAttempts = currentClimbs.reduce((sum, climb) => sum + (climb?.attempts || 1), 0);
    const previousAttempts = previousClimbs.reduce((sum, climb) => sum + (climb?.attempts || 1), 0);
    const currentSent = currentClimbs.filter((climb) => climb?.sent).length;
    const previousSent = previousClimbs.filter((climb) => climb?.sent).length;

    const currentRatio = currentAttempts > 0 ? Math.round((currentSent / currentAttempts) * 100) : 0;
    const previousRatio = previousAttempts > 0 ? Math.round((previousSent / previousAttempts) * 100) : 0;
    const hardestCurrent =
      pyramid.rows.find((row) => row.sent > 0)?.label || pyramid.rows[0]?.label || 'tu nivel actual';

    if (currentAttempts === 0 && previousAttempts === 0) {
      return 'Todavía no hay suficiente histórico para detectar una tendencia clara. Registra más sesiones para activar observaciones útiles.';
    }

    if (currentRatio > previousRatio + 4) {
      return `Tu ratio tops/intentos en ${hardestCurrent} ha subido del ${previousRatio}% al ${currentRatio}% en las últimas 4 semanas. El bloque específico está dando resultado.`;
    }

    if (currentRatio + 4 < previousRatio) {
      return `El ratio tops/intentos en ${hardestCurrent} ha caído del ${previousRatio}% al ${currentRatio}% en las últimas 4 semanas. Probablemente necesitas descargar o bajar un punto la intensidad.`;
    }

    return `Tu ratio tops/intentos en ${hardestCurrent} se mantiene estable en torno al ${currentRatio}%. Hay consistencia; el siguiente salto vendrá por calidad de intentos más que por volumen.`;
  }, [pyramid.rows, pyramidMode, sessions]);

  const recentSessions = useMemo(() => [...sessions].reverse().slice(0, 5).reverse(), [sessions]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[980px] pb-24 pt-4 sm:pt-6">
        <div className="space-y-8 px-4 sm:space-y-10 sm:px-6 md:px-8">
          <header>
            <Kicker>Tendencias</Kicker>
            <h1
              className="mt-3 text-[clamp(2.5rem,8vw,4.25rem)] font-bold uppercase leading-none tracking-[-0.05em]"
              style={{ color: T.ink }}
            >
              Análisis
            </h1>
          </header>

          <div
            className="grid grid-cols-4 overflow-hidden border"
            style={{ borderColor: T.ruleStrong, background: T.bg }}
          >
            {(['7d', '4w', '12w', '1y'] as TimePeriod[]).map((period) => {
              const active = timePeriod === period;
              return (
                <button
                  key={period}
                  className="px-4 py-4 text-center font-mono text-[11px] uppercase tracking-[0.18em]"
                  onClick={() => setTimePeriod(period)}
                  style={{
                    background: 'transparent',
                    borderRight: period !== '1y' ? `1px solid ${T.rule}` : 'none',
                    color: active ? T.ink : T.inkFaint,
                    boxShadow: active ? `inset 0 -2px 0 0 ${T.ink}` : 'none',
                  }}
                  type="button"
                >
                  {period}
                </button>
              );
            })}
          </div>

          <section className="space-y-5">
            <Kicker index="01">Carga · ACWR</Kicker>
            <div className="grid gap-5 border-t pt-4 md:grid-cols-[180px_minmax(0,1fr)]" style={{ borderColor: T.rule }}>
              <div>
                <div
                  className="text-[clamp(4rem,11vw,6.25rem)] font-bold leading-[0.88] tracking-[-0.08em]"
                  style={{ color: T.ink }}
                >
                  {acwrData.acwr.toFixed(2)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: T.inkFaint }}>
                    {acwrData.label}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: T.inkFaint }}>
                    Ramp rate{' '}
                    <span style={{ color: acwrData.rampRate >= 0 ? T.ink : T.accent }}>
                      {acwrData.rampRate >= 0 ? '+' : ''}
                      {acwrData.rampRate.toFixed(1)}%
                    </span>
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="relative h-[2px] w-full" style={{ background: T.ruleStrong }}>
                    <span className="absolute left-[40%] top-1/2 h-4 w-px -translate-y-1/2 bg-white/80" />
                    <span className="absolute left-[70%] top-1/2 h-4 w-px -translate-y-1/2" style={{ background: T.accent }} />
                    <span
                      className="absolute top-1/2 h-5 w-[2px] -translate-y-1/2 transition-all"
                      style={{
                        background: T.ink,
                        left: `${Math.min(Math.max(((acwrData.acwr - 0.4) / 1.8) * 100, 0), 100)}%`,
                      }}
                    />
                    <span
                      className="absolute right-0 top-0 h-[2px] w-[28%]"
                      style={{ background: 'rgba(226,58,31,0.35)' }}
                    />
                  </div>

                  <div className="flex justify-between font-mono text-[10px]" style={{ color: T.inkFaint }}>
                    <span>0.0</span>
                    <span>0.8</span>
                    <span style={{ color: T.accent }}>1.5</span>
                    <span>2.0</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Kicker index="02">Volumen semanal</Kicker>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                min · rpe
              </span>
            </div>

            <div className="border p-4" style={{ borderColor: T.ruleStrong, background: T.panel }}>
              <div className="flex items-end gap-3 overflow-x-auto pb-2">
                {periodData.volumeBuckets.map((bucket, index) => {
                  const maxTotal = Math.max(...periodData.volumeBuckets.map((item) => item.total), 1);
                  const last = index === periodData.volumeBuckets.length - 1;

                  return (
                    <div key={bucket.label} className="flex min-w-[34px] flex-1 flex-col items-center gap-2">
                      <div className="flex h-[168px] w-full max-w-[26px] items-end">
                        <div className="flex h-full w-full flex-col justify-end gap-[2px]">
                          {ACTIVITY_ORDER.map((type, typeIndex) => {
                            const value = Number(bucket[type] || 0);
                            const height = bucket.total > 0 ? (value / maxTotal) * 156 : 0;
                            const isTopSegment = typeIndex === ACTIVITY_ORDER.length - 1;

                            return (
                              <div
                                key={type}
                                className="w-full"
                                style={{
                                  background: last && type === 'running' ? T.accent : ACTIVITY_COLORS[type],
                                  height: `${Math.max(height, value > 0 ? 6 : 0)}px`,
                                  borderRadius: isTopSegment ? '2px 2px 0 0' : '0',
                                  opacity: last && type !== 'running' ? 0.85 : 1,
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.14em]"
                        style={{ color: last ? T.accent : T.inkFaint }}
                      >
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {ACTIVITY_ORDER.map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5" style={{ background: ACTIVITY_COLORS[type] }} />
                    <span style={{ color: T.ink }}>
                      {ACTIVITY_LABELS[type]}{' '}
                      <span style={{ color: T.inkMuted }}>{periodData.totals[type].toFixed(1)}h</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <Kicker index="03">Constancia · 12 semanas</Kicker>
            <div className="border p-4" style={{ borderColor: T.ruleStrong, background: T.panel }}>
              <div className="space-y-2">
                {consistency.rows.map((row) => (
                  <div key={row.dayLabel} className="grid grid-cols-[20px_repeat(12,minmax(0,1fr))] gap-1.5">
                    <span className="self-center text-[10px] uppercase tracking-[0.12em]" style={{ color: T.inkFaint }}>
                      {row.dayLabel}
                    </span>
                    {row.cells.map((value, index) => (
                      <span
                        key={`${row.dayLabel}-${index}`}
                        className="aspect-square min-h-[18px] border"
                        style={{
                          background:
                            value === 0
                              ? 'transparent'
                              : value === 1
                                ? 'rgba(245,245,244,0.22)'
                                : value === 2
                                  ? 'rgba(245,245,244,0.58)'
                                  : '#F5F5F4',
                          borderColor: value === 0 ? T.ruleStrong : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px]" style={{ color: T.inkFaint }}>
                <span>{consistency.startLabel}</span>
                <span>{consistency.endLabel}</span>
              </div>
            </div>
          </section>

          {runningTrend.values.length > 1 && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Kicker index="04">Ritmo medio · running</Kicker>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                    vs bloque previo
                  </div>
                  <div className="mt-1 font-mono text-lg" style={{ color: T.ink }}>
                    {runningTrend.delta >= 0 ? '+' : '-'}
                    {Math.abs(runningTrend.delta).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="border p-4" style={{ borderColor: T.ruleStrong, background: T.panel }}>
                <div className="flex items-end gap-2">
                  <span
                    className="text-[clamp(3rem,9vw,4.5rem)] font-bold leading-[0.9] tracking-[-0.08em]"
                    style={{ color: T.ink }}
                  >
                    {Math.floor(runningTrend.averagePace)}:
                    {Math.round((runningTrend.averagePace % 1) * 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                  <span className="pb-2 text-lg uppercase tracking-[0.12em]" style={{ color: T.inkFaint }}>
                    / km
                  </span>
                </div>

                <div className="mt-5 h-[120px] border-t pt-4" style={{ borderColor: T.rule }}>
                  <svg viewBox="0 0 100 40" className="h-full w-full overflow-visible">
                    <path
                      d={buildSparklinePath(runningTrend.values)}
                      fill="none"
                      stroke="rgba(250,250,249,0.9)"
                      strokeWidth="0.75"
                    />
                    {runningTrend.values.map((value, index) => {
                      const min = Math.min(...runningTrend.values);
                      const max = Math.max(...runningTrend.values);
                      const range = max - min || 1;
                      const x = (index / Math.max(runningTrend.values.length - 1, 1)) * 100;
                      const y = 34 - ((value - min) / range) * 30 - 2;
                      return (
                        <circle key={index} cx={x} cy={y} r="1.2" fill="#FAFAF9" />
                      );
                    })}
                  </svg>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Kicker index="05">Pirámide · {timePeriod === '12w' ? '12 sem' : timePeriod.toUpperCase()}</Kicker>

              <div className="grid grid-cols-3 overflow-hidden border" style={{ borderColor: T.ruleStrong }}>
                {([
                  { id: 'route', label: 'Vía' },
                  { id: 'boulder', label: 'Bloque' },
                  { id: 'both', label: 'Ambas' },
                ] as const).map((tab) => {
                  const active = pyramidMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      className="px-4 py-2.5 text-[11px] uppercase tracking-[0.18em]"
                      onClick={() => setPyramidMode(tab.id)}
                      style={{
                        background: active ? T.ink : 'transparent',
                        borderRight: tab.id !== 'both' ? `1px solid ${T.ruleStrong}` : 'none',
                        color: active ? T.bg : T.inkMuted,
                      }}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border p-4" style={{ borderColor: T.ruleStrong, background: T.panel }}>
              <div className="grid gap-4 border-b pb-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]" style={{ borderColor: T.rule }}>
                {[
                  { value: pyramid.sentTotal, label: pyramidMode === 'boulder' ? 'Tops bloque' : 'Tops vía' },
                  { value: pyramid.attemptsTotal, label: 'Intentos' },
                  { value: `${Math.round(pyramid.ratio)}%`, label: 'Ratio envío' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-4xl font-bold tracking-[-0.06em]" style={{ color: T.ink }}>
                      {stat.value}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                      {stat.label}
                    </div>
                  </div>
                ))}

                <div className="self-end text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                    {pyramid.scaleLabel}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {pyramid.rows.length === 0 ? (
                  <div className="py-6 text-sm" style={{ color: T.inkMuted }}>
                    No hay suficientes escaladas registradas en este modo para construir la pirámide.
                  </div>
                ) : (
                  pyramid.rows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[46px_minmax(0,1fr)_48px] items-center gap-3">
                      <div
                        className="text-3xl font-medium tracking-[-0.04em] sm:text-[2rem]"
                        style={{ color: row.accent ? T.ink : T.inkMuted }}
                      >
                        {row.label}
                      </div>

                      <div className="h-[2px] w-full" style={{ background: T.ruleStrong }}>
                        <div
                          className="h-[2px]"
                          style={{
                            background: row.accent ? T.accent : T.inkMuted,
                            width: `${Math.max(row.ratio * 100, row.sent > 0 ? 6 : 0)}%`,
                          }}
                        />
                      </div>

                      <div className="text-right font-mono text-sm" style={{ color: row.accent ? T.accent : T.inkMuted }}>
                        {row.sent}/{row.attempts}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <Kicker index="06">Observación</Kicker>
            <div className="border p-6 sm:p-7" style={{ borderColor: T.ruleStrong, background: T.panel }}>
              <p className="max-w-3xl text-xl leading-relaxed sm:text-[2rem]" style={{ color: T.ink }}>
                "{observation}"
              </p>
              <div className="mt-6 text-[10px] uppercase tracking-[0.22em]" style={{ color: T.inkFaint }}>
                — Ascend · entrenador
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Kicker index="07">Sesiones recientes</Kicker>
              <div className="flex items-center gap-4">
                <Link
                  to="/sessions"
                  className="text-[11px] uppercase tracking-[0.18em]"
                  style={{ color: T.ink }}
                >
                  Todas →
                </Link>
                <Link
                  to="/sessions/new"
                  className="inline-flex items-center gap-2 border px-3 py-2 text-[11px] uppercase tracking-[0.18em]"
                  style={{ borderColor: T.ruleStrong, color: T.ink }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nueva sesión
                </Link>
              </div>
            </div>

            <div className="border" style={{ borderColor: T.ruleStrong, background: T.bg }}>
              {recentSessions.length === 0 ? (
                <div className="px-4 py-8 text-sm" style={{ color: T.inkMuted }}>
                  Aún no hay sesiones registradas.
                </div>
              ) : (
                recentSessions.map((session, index) => {
                  const config = SESSION_ICON_CONFIG[session.session_type] || SESSION_ICON_CONFIG.training;
                  const SessionIcon = config.Icon;
                  const sends = session.climbs?.filter((climb) => climb.sent).length || 0;
                  const attempts = session.climbs?.reduce((sum, climb) => sum + (climb.attempts || 0), 0) || 0;

                  return (
                    <Link
                      key={session.id}
                      to={`/sessions/${session.id}`}
                      className="flex items-center gap-4 px-4 py-4 no-underline sm:px-5"
                      style={{
                        borderBottom: index < recentSessions.length - 1 ? `1px solid ${T.rule}` : 'none',
                      }}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ background: T.panelSoft, border: `1px solid ${T.ruleStrong}`, color: config.accent }}
                      >
                        <SessionIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                          {format(parseISO(session.date), 'EEE d MMM', { locale: es })}
                        </div>
                        <div className="mt-1 text-lg font-semibold tracking-[-0.03em]" style={{ color: T.ink }}>
                          {formatSessionTitle(session)}
                        </div>
                      </div>

                      <div className="text-right">
                        {CLIMB_TYPES.has(session.session_type) ? (
                          <>
                            <div className="text-3xl font-bold leading-none tracking-[-0.06em]" style={{ color: T.ink }}>
                              {sends}
                              <span className="text-sm font-normal" style={{ color: T.inkFaint }}>
                                /{attempts || session.climbs?.length || 0}
                              </span>
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                              tops
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-3xl font-bold leading-none tracking-[-0.06em]" style={{ color: T.ink }}>
                              {Number(session.distance_km || 0).toFixed(1)}
                              <span className="text-sm font-normal" style={{ color: T.inkFaint }}>
                                {' '}
                                km
                              </span>
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                              {getSessionDuration(session)} min
                            </div>
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
