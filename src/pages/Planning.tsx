import { ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  addMonths,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bike,
  Cable,
  Plus,
  Check,
  Trash2,
  Calendar as CalendarIcon,
  Dumbbell,
  Pencil,
  MapPin,
  Clock,
  Route,
  Footprints,
  Mountain,
  Zap,
  Layers3,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EditPlannedSessionDialog from '@/components/planning/EditPlannedSessionDialog';
import TemplatePicker from '@/components/planning/TemplatePicker';
import TemplateBuilder, { type TemplateBlock } from '@/components/planning/TemplateBuilder';
import {
  encodePlannedSessionNotes,
  getPlannedSessionMeta,
  planningOptions,
  type PlannedFocus,
} from '@/lib/planning';
import type { SessionData } from '@/utils/metricsUtils';

type SessionType = 'boulder' | 'rope' | 'hybrid' | 'training' | 'running' | 'bike';
type PlanningView = 'calendar' | 'upcoming';

interface PlannedSession {
  id: string;
  date: string;
  session_type: SessionType;
  notes: string | null;
  trainer_notes: string | null;
  completed: boolean;
  gym_id: string | null;
  distance_km?: number | null;
  time_min?: number | null;
  gyms?: { name: string } | null;
}

interface LoggedSession extends SessionData {
  description: string | null;
  notes: string | null;
  gyms?: { name: string; city: string | null } | null;
}

const planningOrder: PlannedFocus[] = [
  'running',
  'bike',
  'strength',
  'campus',
  'rope',
  'boulder',
  'hybrid',
];

const planningIcons: Record<PlannedFocus, ReactNode> = {
  boulder: <Mountain className="h-4 w-4" />,
  rope: <Cable className="h-4 w-4" />,
  hybrid: <Layers3 className="h-4 w-4" />,
  running: <Footprints className="h-4 w-4" />,
  bike: <Bike className="h-4 w-4" />,
  strength: <Dumbbell className="h-4 w-4" />,
  campus: <Zap className="h-4 w-4" />,
  training: <Dumbbell className="h-4 w-4" />,
};

const CLIMB_SESSION_TYPES = new Set<SessionType>(['boulder', 'rope', 'hybrid']);

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

function getSessionDuration(session: Pick<LoggedSession, 'duration_min' | 'time_min'>) {
  return session.duration_min || session.time_min || 0;
}

function getSessionLoad(session: LoggedSession) {
  const duration = getSessionDuration(session);
  const defaultRpe = CLIMB_SESSION_TYPES.has(session.session_type) ? 6 : 5;
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

function parseTemplateBlocks(rawValue: string | null) {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue) as TemplateBlock[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function monthLabel(date: Date) {
  const value = format(date, 'MMMM', { locale: es });
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function IconButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center transition-colors"
      style={{
        background: 'transparent',
        border: `1px solid ${T.ruleStrong}`,
        color: T.ink,
      }}
      type="button"
    >
      {children}
    </button>
  );
}

export default function Planning() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PlannedSession | null>(null);
  const [planningView, setPlanningView] = useState<PlanningView>('calendar');
  const [newSession, setNewSession] = useState({
    focus: 'running' as PlannedFocus,
    notes: '',
    trainer_notes: '',
    gym_id: '',
    distance_km: '',
    time_min: '',
  });
  const [sessionBlocks, setSessionBlocks] = useState<TemplateBlock[]>([]);
  const [templateTab, setTemplateTab] = useState<'blocks' | 'notes'>('blocks');

  const { data: plannedSessions = [] } = useQuery({
    queryKey: ['planned-sessions', user?.id, format(month, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(month);
      const end = addMonths(start, 1);

      const { data, error } = await supabase
        .from('planned_sessions')
        .select('*, gyms(name)')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lt('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      return data as PlannedSession[];
    },
    enabled: !!user,
  });

  const { data: loggedSessions = [] } = useQuery({
    queryKey: ['sessions', user?.id, 'planning'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, date, session_type, duration_min, time_min, distance_km, elevation_gain_m, rpe_1_10, description, notes, gyms(name, city), climbs(id, sent, flash, attempts, discipline, color_band, grade_value, session_id)',
        )
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .order('date', { ascending: false });

      if (error) throw error;
      return data as LoggedSession[];
    },
    enabled: !!user,
  });

  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gyms').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      const selectedOption = planningOptions[newSession.focus];

      const { error } = await supabase.from('planned_sessions').insert({
        user_id: user.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        session_type: selectedOption.sessionType,
        notes: encodePlannedSessionNotes(newSession.notes, newSession.focus),
        trainer_notes: sessionBlocks.length > 0 ? JSON.stringify(sessionBlocks) : newSession.trainer_notes || null,
        gym_id: selectedOption.showGym ? newSession.gym_id || null : null,
        distance_km:
          selectedOption.showDistance && newSession.distance_km
            ? parseFloat(newSession.distance_km)
            : null,
        time_min:
          selectedOption.showTime && newSession.time_min ? parseInt(newSession.time_min, 10) : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sesión planificada añadida');
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
      setDialogOpen(false);
      setNewSession({
        focus: 'running',
        notes: '',
        trainer_notes: '',
        gym_id: '',
        distance_km: '',
        time_min: '',
      });
      setSessionBlocks([]);
      setTemplateTab('blocks');
      setPlanningView('calendar');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const toggleCompletedMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from('planned_sessions').update({ completed }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planned_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sesión eliminada');
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
    },
  });

  const today = startOfDay(new Date());

  const selectedDateSessions = useMemo(
    () => plannedSessions.filter((session) => isSameDay(parseISO(session.date), selectedDate)),
    [plannedSessions, selectedDate],
  );

  const calendarDayData = useMemo(
    () =>
      plannedSessions.reduce(
        (acc, session) => {
          const key = session.date;
          if (!acc[key]) {
            acc[key] = { planned: 0, completed: 0 };
          }
          acc[key].planned += 1;
          if (session.completed) {
            acc[key].completed += 1;
          }
          return acc;
        },
        {} as Record<string, { planned: number; completed: number }>,
      ),
    [plannedSessions],
  );

  const datesWithLoggedSessions = useMemo(
    () => new Set(loggedSessions.map((session) => session.date)),
    [loggedSessions],
  );

  const upcomingSessions = useMemo(
    () =>
      plannedSessions
        .filter((session) => parseISO(session.date) >= today && !session.completed)
        .slice(0, 8),
    [plannedSessions, today],
  );

  const weekSnapshot = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const sessionsThisWeek = loggedSessions.filter((session) =>
      isWithinInterval(parseISO(session.date), { start: weekStart, end: weekEnd }),
    );
    const weeklyMinutes = sessionsThisWeek.reduce(
      (sum, session) => sum + getSessionDuration(session),
      0,
    );
    const acuteLoad = sessionsThisWeek.reduce((sum, session) => sum + getSessionLoad(session), 0);

    return {
      sessions: sessionsThisWeek.length,
      hours: weeklyMinutes / 60,
      load: Math.round(acuteLoad),
    };
  }, [loggedSessions, today]);

  const selectedDateLoggedSessions = useMemo(
    () => loggedSessions.filter((session) => isSameDay(parseISO(session.date), selectedDate)),
    [loggedSessions, selectedDate],
  );

  const renderBlockSummary = (session: PlannedSession) => {
    const blocks = parseTemplateBlocks(session.trainer_notes);
    if (!blocks || blocks.length === 0) {
      if (!session.trainer_notes) return null;
      return (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: T.inkMuted }}>
          {session.trainer_notes}
        </p>
      );
    }

    const blockLabels: Record<TemplateBlock['type'], string> = {
      warmup: 'Cal.',
      main: 'Bloque',
      cooldown: 'Vuelta',
    };

    return (
      <div className="mt-3 space-y-2">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="flex items-center gap-3 px-3 py-2"
            style={{
              background: block.type === 'main' ? T.accentDim : T.panelSoft,
              border: `1px solid ${block.type === 'main' ? 'rgba(226,58,31,0.28)' : T.rule}`,
            }}
          >
            <span
              className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: block.type === 'main' ? T.ink : T.inkFaint, minWidth: 44 }}
            >
              {blockLabels[block.type]}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm" style={{ color: T.ink }}>
              {block.label || 'Sin descripción'}
              {block.optional && <span style={{ color: T.inkFaint }}> · opcional</span>}
            </span>
            {(block.sets || block.grade) && (
              <span className="shrink-0 font-mono text-[11px]" style={{ color: T.inkMuted }}>
                {block.sets ? `${block.sets}×` : ''}
                {block.grade ? ` ${block.grade}` : ''}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPlannedSessionCard = (session: PlannedSession) => {
    const { focus, notes, option } = getPlannedSessionMeta(session.session_type, session.notes);
    const metaRow = [
      session.gyms?.name,
      session.time_min ? `${session.time_min} min` : null,
      session.distance_km ? `${session.distance_km} km` : null,
    ].filter(Boolean);

    return (
      <div
        key={session.id}
        className="border px-4 py-4 sm:px-5"
        style={{
          background: session.completed ? 'rgba(250,250,249,0.02)' : T.panel,
          borderColor: session.completed ? T.rule : T.ruleStrong,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: session.completed ? T.panelSoft : 'rgba(250,250,249,0.04)',
              border: `1px solid ${session.completed ? T.rule : T.ruleStrong}`,
              color: session.completed ? T.inkFaint : T.ink,
            }}
          >
            {planningIcons[focus]}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: T.inkFaint }}>
                {option.label}
              </span>
              {session.completed && (
                <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: T.accent }}>
                  Completada
                </span>
              )}
              {selectedDateLoggedSessions.some((logged) => logged.date === session.date) && (
                <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: T.inkMuted }}>
                  Registrada
                </span>
              )}
            </div>

            <h3 className="mt-2 text-lg font-semibold leading-tight sm:text-xl" style={{ color: T.ink }}>
              {session.gyms?.name ? `${option.label} · ${session.gyms.name}` : option.label}
            </h3>

            {metaRow.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm" style={{ color: T.inkMuted }}>
                {session.gyms?.name && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {session.gyms.name}
                  </span>
                )}
                {session.time_min && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {session.time_min} min
                  </span>
                )}
                {session.distance_km && (
                  <span className="inline-flex items-center gap-1.5">
                    <Route className="h-3.5 w-3.5" />
                    {session.distance_km} km
                  </span>
                )}
              </div>
            )}

            {renderBlockSummary(session)}

            {notes && (
              <p className="mt-3 text-sm leading-relaxed" style={{ color: T.inkMuted }}>
                {notes}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <button
              aria-label="Editar sesión planificada"
              className="flex h-9 w-9 items-center justify-center transition-colors"
              onClick={() => setEditingSession(session)}
              style={{ border: `1px solid ${T.rule}`, color: T.inkMuted }}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              aria-label={session.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
              className="flex h-9 w-9 items-center justify-center transition-colors"
              onClick={() =>
                toggleCompletedMutation.mutate({
                  id: session.id,
                  completed: !session.completed,
                })
              }
              style={{
                background: session.completed ? T.panelSoft : T.accent,
                border: `1px solid ${session.completed ? T.rule : T.accent}`,
                color: session.completed ? T.ink : T.bg,
              }}
              type="button"
            >
              <Check className="h-4 w-4" />
            </button>
            {!session.completed && (
              <button
                aria-label="Eliminar sesión planificada"
                className="flex h-9 w-9 items-center justify-center transition-colors"
                onClick={() => {
                  if (confirm('¿Eliminar esta sesión planificada?')) {
                    deleteMutation.mutate(session.id);
                  }
                }}
                style={{ border: `1px solid ${T.rule}`, color: 'rgba(226,58,31,0.82)' }}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[920px] pb-24 pt-4 sm:pt-6">
        <div className="space-y-8 px-4 sm:space-y-10 sm:px-6 md:px-8">
          <header className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <Kicker>Planificación</Kicker>
              <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                <h1
                  className="text-[clamp(2.5rem,8vw,4.25rem)] font-bold uppercase leading-none tracking-[-0.05em]"
                  style={{ color: T.ink }}
                >
                  {monthLabel(month)}
                </h1>
                <span
                  className="text-[clamp(2.25rem,7vw,4rem)] font-medium leading-none tracking-[-0.05em]"
                  style={{ color: T.inkFaint }}
                >
                  {format(month, 'yyyy')}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <IconButton
                ariaLabel="Mes anterior"
                onClick={() => setMonth((current) => addMonths(current, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <IconButton
                ariaLabel="Mes siguiente"
                onClick={() => setMonth((current) => addMonths(current, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          </header>

          <div
            className="grid grid-cols-2 overflow-hidden border"
            style={{ borderColor: T.ruleStrong, background: T.bg }}
          >
            {([
              { id: 'calendar', label: 'Calendario' },
              { id: 'upcoming', label: 'Próximas' },
            ] as const).map((tab) => {
              const active = planningView === tab.id;
              return (
                <button
                  key={tab.id}
                  className="px-4 py-4 text-center text-[11px] uppercase tracking-[0.2em] transition-colors"
                  onClick={() => setPlanningView(tab.id)}
                  style={{
                    background: active ? T.ink : 'transparent',
                    color: active ? T.bg : T.inkMuted,
                    borderRight: tab.id === 'calendar' ? `1px solid ${T.ruleStrong}` : 'none',
                  }}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {planningView === 'calendar' ? (
            <div className="space-y-6">
              <div className="border p-3 sm:p-4" style={{ borderColor: T.ruleStrong, background: T.bg }}>
                <Calendar
                  mode="single"
                  month={month}
                  onMonthChange={setMonth}
                  locale={es}
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  showOutsideDays={false}
                  className="w-full p-0"
                  classNames={{
                    months: 'w-full',
                    month: 'w-full space-y-3',
                    caption: 'hidden',
                    nav: 'hidden',
                    table: 'w-full border-collapse',
                    head_row: 'grid grid-cols-7',
                    head_cell:
                      'pb-3 text-center font-mono text-[10px] font-normal uppercase tracking-[0.22em] text-white/38',
                    row: 'grid grid-cols-7',
                    cell: 'relative aspect-square border border-white/10 text-left align-top',
                    day: 'h-full w-full rounded-none p-0',
                    day_hidden: 'invisible',
                    day_outside: 'invisible',
                    day_disabled: 'opacity-40',
                  }}
                  components={{
                    Day: ({ date, displayMonth: _displayMonth, ...props }) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const dayInfo = calendarDayData[dateStr];
                      const hasLoggedSession = datesWithLoggedSessions.has(dateStr);
                      const hasCompleted = (dayInfo?.completed || 0) > 0 || hasLoggedSession;
                      const hasPlanned = (dayInfo?.planned || 0) > 0 && (!hasCompleted || (dayInfo?.planned || 0) > (dayInfo?.completed || 0));
                      const isSelected = isSameDay(date, selectedDate);
                      const isToday = isSameDay(date, today);

                      return (
                        <button
                          {...props}
                          className="relative flex h-full w-full flex-col items-start justify-between px-2 py-2 text-left transition-colors"
                          onClick={() => setSelectedDate(date)}
                          style={{
                            background: isSelected ? T.ink : 'transparent',
                            color: isSelected ? T.bg : T.ink,
                          }}
                          type="button"
                        >
                          <span className="text-base font-medium leading-none sm:text-lg">{date.getDate()}</span>

                          <div className="flex items-center gap-1">
                            {hasCompleted && (
                              <span
                                className="h-1.5 w-1.5"
                                style={{ background: isSelected ? T.bg : T.ink }}
                              />
                            )}
                            {hasPlanned && (
                              <span
                                className="h-1.5 w-1.5 border"
                                style={{ borderColor: isSelected ? T.bg : T.inkMuted }}
                              />
                            )}
                          </div>

                          {isToday && !isSelected && (
                            <span
                              className="absolute bottom-0 left-1/2 h-[2px] w-7 -translate-x-1/2"
                              style={{ background: T.accent }}
                            />
                          )}
                        </button>
                      );
                    },
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2" style={{ background: T.ink }} />
                  Completado
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 border" style={{ borderColor: T.inkMuted }} />
                  Planificado
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <Kicker index="01">Sesiones del día</Kicker>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]" style={{ color: T.ink }}>
                      {format(selectedDate, "d 'de' MMMM", { locale: es })}
                    </h2>
                  </div>
                  <span className="text-sm" style={{ color: T.inkFaint }}>
                    {selectedDateSessions.length} sesión{selectedDateSessions.length === 1 ? '' : 'es'}
                  </span>
                </div>

                {selectedDateSessions.length === 0 ? (
                  <div
                    className="border px-5 py-8 text-center"
                    style={{ borderColor: T.ruleStrong, background: T.panel }}
                  >
                    <CalendarIcon className="mx-auto mb-3 h-8 w-8" style={{ color: T.inkFaint }} />
                    <p className="text-sm" style={{ color: T.inkMuted }}>
                      No hay sesiones planificadas para este día.
                    </p>
                    {selectedDateLoggedSessions.length > 0 && (
                      <p className="mt-2 text-xs uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                        Ya tienes actividad registrada en esta fecha.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateSessions.map((session) => renderPlannedSessionCard(session))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Kicker index="01">Próximas sesiones</Kicker>

              {upcomingSessions.length === 0 ? (
                <div
                  className="border px-5 py-8 text-center"
                  style={{ borderColor: T.ruleStrong, background: T.panel }}
                >
                  <CalendarIcon className="mx-auto mb-3 h-8 w-8" style={{ color: T.inkFaint }} />
                  <p className="text-sm" style={{ color: T.inkMuted }}>
                    No hay sesiones pendientes este mes.
                  </p>
                </div>
              ) : (
                <div className="border" style={{ borderColor: T.ruleStrong, background: T.bg }}>
                  {upcomingSessions.map((session, index) => {
                    const sessionDate = parseISO(session.date);
                    const { option, notes } = getPlannedSessionMeta(session.session_type, session.notes);
                    const subtitle = [
                      session.time_min ? `${session.time_min} min` : null,
                      session.distance_km ? `${session.distance_km} km` : null,
                      notes || session.trainer_notes || null,
                    ]
                      .filter(Boolean)
                      .join(' · ');

                    return (
                      <button
                        key={session.id}
                        className="flex w-full items-center gap-4 px-4 py-5 text-left transition-colors sm:px-5"
                        onClick={() => {
                          setSelectedDate(sessionDate);
                          setMonth(sessionDate);
                          setPlanningView('calendar');
                        }}
                        style={{
                          borderBottom:
                            index < upcomingSessions.length - 1 ? `1px solid ${T.rule}` : 'none',
                        }}
                        type="button"
                      >
                        <div
                          className="w-16 shrink-0 border-r pr-4 sm:w-20"
                          style={{ borderColor: T.rule }}
                        >
                          <div
                            className="text-[10px] uppercase tracking-[0.18em]"
                            style={{ color: T.inkFaint }}
                          >
                            {format(sessionDate, 'EEE', { locale: es })}
                          </div>
                          <div
                            className="mt-1 text-[2.2rem] font-bold leading-none tracking-[-0.06em]"
                            style={{ color: T.ink }}
                          >
                            {format(sessionDate, 'd')}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xl font-semibold leading-tight tracking-[-0.03em]" style={{ color: T.ink }}>
                            {session.gyms?.name ? `${option.label} · ${session.gyms.name}` : option.label}
                          </div>
                          {subtitle && (
                            <div className="mt-1 text-sm leading-relaxed" style={{ color: T.inkFaint }}>
                              {subtitle}
                            </div>
                          )}
                        </div>

                        <ChevronRight className="h-4 w-4 shrink-0" style={{ color: T.inkFaint }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                className="w-full border border-dashed px-4 py-5 text-[11px] uppercase tracking-[0.22em] transition-colors"
                style={{ borderColor: T.ruleStrong, color: T.inkMuted, background: 'transparent' }}
                type="button"
              >
                <span className="mr-2">+</span>
                Programar sesión
              </button>
            </DialogTrigger>

            <DialogContent className="max-w-[min(92vw,760px)] border-white/10 bg-[#050505] p-0">
              <div className="flex max-h-[88vh] flex-col">
                <DialogHeader className="border-b border-white/10 px-4 py-4 pr-12 sm:px-6">
                  <DialogTitle className="text-left text-lg font-semibold">Nueva sesión planificada</DialogTitle>
                </DialogHeader>

                <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Tipo de sesión
                    </Label>
                    <Select
                      value={newSession.focus}
                      onValueChange={(v) => setNewSession({ ...newSession, focus: v as PlannedFocus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {planningOrder.map((focus) => (
                          <SelectItem key={focus} value={focus}>
                            {planningOptions[focus].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {planningOptions[newSession.focus].description}
                    </p>
                  </div>

                  {planningOptions[newSession.focus].showGym && (
                    <div className="space-y-2">
                      <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Rocódromo o lugar
                      </Label>
                      <Select
                        value={newSession.gym_id || 'none'}
                        onValueChange={(value) =>
                          setNewSession({ ...newSession, gym_id: value === 'none' ? '' : value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sin ubicación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin ubicación</SelectItem>
                          {gyms.map((gym) => (
                            <SelectItem key={gym.id} value={gym.id}>
                              {gym.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className={cn('grid gap-4', planningOptions[newSession.focus].showDistance && 'sm:grid-cols-2')}>
                    {planningOptions[newSession.focus].showTime && (
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          {newSession.focus === 'running' || newSession.focus === 'bike'
                            ? 'Tiempo (min)'
                            : 'Duración estimada (min)'}
                        </Label>
                        <Input
                          type="number"
                          placeholder={newSession.focus === 'running' || newSession.focus === 'bike' ? '60' : '90'}
                          value={newSession.time_min}
                          onChange={(e) => setNewSession({ ...newSession, time_min: e.target.value })}
                        />
                      </div>
                    )}

                    {planningOptions[newSession.focus].showDistance && (
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Distancia (km)
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="10.5"
                          value={newSession.distance_km}
                          onChange={(e) => setNewSession({ ...newSession, distance_km: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  {newSession.focus === 'rope' || newSession.focus === 'boulder' || newSession.focus === 'hybrid' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 overflow-hidden border" style={{ borderColor: T.rule }}>
                        {(['blocks', 'notes'] as const).map((tab) => {
                          const active = templateTab === tab;
                          return (
                            <button
                              key={tab}
                              className="px-4 py-3 text-[10px] uppercase tracking-[0.18em]"
                              onClick={() => setTemplateTab(tab)}
                              style={{
                                background: active ? T.panelSoft : 'transparent',
                                color: active ? T.ink : T.inkFaint,
                                borderRight: tab === 'blocks' ? `1px solid ${T.rule}` : 'none',
                              }}
                              type="button"
                            >
                              {tab === 'blocks' ? 'Constructor' : 'Texto libre'}
                            </button>
                          );
                        })}
                      </div>

                      {templateTab === 'blocks' ? (
                        <div className="space-y-4">
                          <TemplatePicker
                            sessionType={planningOptions[newSession.focus].sessionType}
                            onSelect={(blocks) => setSessionBlocks(blocks)}
                          />

                          <div>
                            <div className="mb-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                              {sessionBlocks.length > 0 ? 'Editar bloques de esta sesión' : 'Crea bloques desde cero'}
                            </div>
                            <TemplateBuilder blocks={sessionBlocks} onChange={setSessionBlocks} />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Plan de la sesión
                          </Label>
                          <Textarea
                            value={newSession.trainer_notes}
                            onChange={(e) => setNewSession({ ...newSession, trainer_notes: e.target.value })}
                            placeholder="Objetivo, bloques, series, repeticiones, ritmo o descansos..."
                            rows={4}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Plan de la sesión
                      </Label>
                      <Textarea
                        value={newSession.trainer_notes}
                        onChange={(e) => setNewSession({ ...newSession, trainer_notes: e.target.value })}
                        placeholder="Objetivo, series, repeticiones, ritmo o descansos..."
                        rows={4}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Mis notas
                    </Label>
                    <Textarea
                      value={newSession.notes}
                      onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                      placeholder="Notas personales..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="border-t border-white/10 px-4 py-3 sm:px-6">
                  <Button
                    className="w-full"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir sesión
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <section className="space-y-4 border-t pt-6" style={{ borderColor: T.rule }}>
            <Kicker index="02">Semana en curso</Kicker>

            <div className="grid grid-cols-3 border-y" style={{ borderColor: T.ruleStrong }}>
              {[
                { value: weekSnapshot.sessions, unit: '', label: 'Sesiones' },
                { value: weekSnapshot.hours.toFixed(1), unit: 'h', label: 'Tiempo' },
                { value: weekSnapshot.load, unit: 'au', label: 'Carga' },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className="px-2 py-5 sm:px-4 sm:py-6"
                  style={{ borderRight: index < 2 ? `1px solid ${T.rule}` : 'none' }}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[2rem] font-bold leading-none tracking-[-0.06em]" style={{ color: T.ink }}>
                      {item.value}
                    </span>
                    {item.unit && (
                      <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                        {item.unit}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.2em]" style={{ color: T.inkFaint }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <EditPlannedSessionDialog
        session={editingSession}
        open={!!editingSession}
        onOpenChange={(open) => !open && setEditingSession(null)}
      />
    </AppLayout>
  );
}
