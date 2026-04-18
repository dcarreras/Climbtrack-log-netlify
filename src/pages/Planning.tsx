import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfDay,
  subDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
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
  CheckCircle2,
  CircleDashed,
  Footprints,
  Mountain,
  Zap,
  Layers3,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EditPlannedSessionDialog from '@/components/planning/EditPlannedSessionDialog';
import TrainingLoadACWR from '@/components/dashboard/TrainingLoadACWR';
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

const planningIcons: Record<PlannedFocus, React.ReactNode> = {
  boulder: <Mountain className="h-4 w-4" />,
  rope: <Mountain className="h-4 w-4" />,
  hybrid: <Layers3 className="h-4 w-4" />,
  running: <Footprints className="h-4 w-4" />,
  bike: <Bike className="h-4 w-4" />,
  strength: <Dumbbell className="h-4 w-4" />,
  campus: <Zap className="h-4 w-4" />,
  training: <Dumbbell className="h-4 w-4" />,
};

const CLIMB_SESSION_TYPES = new Set<SessionType>(['boulder', 'rope', 'hybrid']);

const loggedSessionMeta: Record<
  SessionType,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  boulder: {
    label: 'Bloque',
    badgeClass: 'border-orange-500/20 bg-orange-500/10 text-orange-600',
    icon: <Mountain className="h-3 w-3" />,
  },
  rope: {
    label: 'Vías',
    badgeClass: 'border-blue-500/20 bg-blue-500/10 text-blue-600',
    icon: <Cable className="h-3 w-3" />,
  },
  hybrid: {
    label: 'Mixta',
    badgeClass: 'border-violet-500/20 bg-violet-500/10 text-violet-600',
    icon: <Layers3 className="h-3 w-3" />,
  },
  training: {
    label: 'Entrenamiento',
    badgeClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
    icon: <Dumbbell className="h-3 w-3" />,
  },
  running: {
    label: 'Running',
    badgeClass: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-600',
    icon: <Footprints className="h-3 w-3" />,
  },
  bike: {
    label: 'Bici',
    badgeClass: 'border-sky-500/20 bg-sky-500/10 text-sky-600',
    icon: <Bike className="h-3 w-3" />,
  },
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

export default function Planning() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PlannedSession | null>(null);
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

  // Fetch planned sessions
  const { data: plannedSessions = [] } = useQuery({
    queryKey: ['planned-sessions', user?.id, format(month, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      
      const { data, error } = await supabase
        .from('planned_sessions')
        .select('*, gyms(name)')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      return data as PlannedSession[];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id, 'planning'],
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

  const { data: loggedSessions = [], isLoading: loggedSessionsLoading } = useQuery({
    queryKey: ['sessions', user?.id, 'planning'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, date, session_type, duration_min, time_min, distance_km, elevation_gain_m, rpe_1_10, description, notes, gyms(name, city), climbs(id, sent, flash, attempts, discipline, color_band, grade_value, session_id)',
        )
        .eq('user_id', user!.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as LoggedSession[];
    },
    enabled: !!user,
  });

  // Fetch gyms for selection
  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gyms').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Create planned session
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      const selectedOption = planningOptions[newSession.focus];
      
      const { error } = await supabase.from('planned_sessions').insert({
        user_id: user.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        session_type: selectedOption.sessionType,
        notes: encodePlannedSessionNotes(newSession.notes, newSession.focus),
        trainer_notes: sessionBlocks.length > 0
          ? JSON.stringify(sessionBlocks)
          : newSession.trainer_notes || null,
        gym_id: selectedOption.showGym ? newSession.gym_id || null : null,
        distance_km:
          selectedOption.showDistance && newSession.distance_km
            ? parseFloat(newSession.distance_km)
            : null,
        time_min: selectedOption.showTime && newSession.time_min ? parseInt(newSession.time_min) : null,
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
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Toggle completed
  const toggleCompletedMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('planned_sessions')
        .update({ completed })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
    },
  });

  // Delete planned session
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planned_sessions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sesión eliminada');
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
    },
  });

  const weeklyRunningGoal = Number(profile?.weekly_running_km_goal) || 20;

  // Get sessions for selected date
  const selectedDateSessions = plannedSessions.filter((session) =>
    isSameDay(parseISO(session.date), selectedDate),
  );

  const selectedDateLoggedSessions = loggedSessions.filter((session) =>
    isSameDay(parseISO(session.date), selectedDate),
  );

  const previousLoggedSessions = loggedSessions
    .filter((session) => parseISO(session.date) < startOfDay(selectedDate))
    .slice(0, 6);

  // Get dates with sessions for calendar highlighting
  const datesWithSessions = plannedSessions.reduce((acc, session) => {
    const dateStr = session.date;
    const { focus } = getPlannedSessionMeta(session.session_type, session.notes);
    if (!acc[dateStr]) {
      acc[dateStr] = { focuses: [] as PlannedFocus[], completed: session.completed };
    }
    acc[dateStr].focuses.push(focus);
    acc[dateStr].completed = acc[dateStr].completed && session.completed;
    return acc;
  }, {} as Record<string, { focuses: PlannedFocus[]; completed: boolean }>);

  const datesWithLoggedSessions = useMemo(
    () => new Set(loggedSessions.map((session) => session.date)),
    [loggedSessions],
  );

  // Stats
  const completedSessions = plannedSessions.filter((session) => session.completed);
  const pendingSessions = plannedSessions.filter((session) => !session.completed);
  const totalPlannedKm = plannedSessions.reduce(
    (acc, session) => acc + (Number(session.distance_km) || 0),
    0,
  );
  const completedKm = completedSessions.reduce(
    (acc, session) => acc + (Number(session.distance_km) || 0),
    0,
  );

  const trainingSummary = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const acuteStart = startOfDay(subDays(now, 6));

    const sessionsThisWeek = loggedSessions.filter((session) =>
      isWithinInterval(parseISO(session.date), { start: weekStart, end: weekEnd }),
    );
    const acuteSessions = loggedSessions.filter(
      (session) => parseISO(session.date) >= acuteStart,
    );
    const runningThisWeek = sessionsThisWeek.filter((session) => session.session_type === 'running');
    const bikeThisWeek = sessionsThisWeek.filter((session) => session.session_type === 'bike');
    const climbThisWeek = sessionsThisWeek.filter((session) =>
      CLIMB_SESSION_TYPES.has(session.session_type),
    );
    const climbAttempts = climbThisWeek.reduce(
      (sum, session) =>
        sum +
        (session.climbs?.reduce((total, climb) => total + (climb.attempts || 0), 0) || 0),
      0,
    );
    const climbSends = climbThisWeek.reduce(
      (sum, session) =>
        sum + (session.climbs?.filter((climb) => climb.sent).length || 0),
      0,
    );
    const runningKm = runningThisWeek.reduce(
      (sum, session) => sum + (Number(session.distance_km) || 0),
      0,
    );
    const runningElevation = runningThisWeek.reduce(
      (sum, session) => sum + (Number(session.elevation_gain_m) || 0),
      0,
    );
    const bikeKm = bikeThisWeek.reduce(
      (sum, session) => sum + (Number(session.distance_km) || 0),
      0,
    );
    const bikeElevation = bikeThisWeek.reduce(
      (sum, session) => sum + (Number(session.elevation_gain_m) || 0),
      0,
    );
    const weeklyMinutes = sessionsThisWeek.reduce(
      (sum, session) => sum + getSessionDuration(session),
      0,
    );
    const acuteLoad = acuteSessions.reduce((sum, session) => sum + getSessionLoad(session), 0);
    const avgRpe =
      sessionsThisWeek.filter((session) => session.rpe_1_10).length > 0
        ? sessionsThisWeek.reduce((sum, session) => sum + (session.rpe_1_10 || 0), 0) /
          sessionsThisWeek.filter((session) => session.rpe_1_10).length
        : 0;

    return {
      sessionsThisWeek,
      weeklyMinutes,
      acuteLoad,
      avgRpe,
      runningKm,
      runningElevation,
      bikeKm,
      bikeElevation,
      bikeSessions: bikeThisWeek.length,
      climbSessions: climbThisWeek.length,
      climbAttempts,
      climbSends,
      runningGoalProgress: weeklyRunningGoal > 0 ? (runningKm / weeklyRunningGoal) * 100 : 0,
    };
  }, [loggedSessions, weeklyRunningGoal]);

  const renderLoggedSessionCard = (session: LoggedSession) => {
    const meta = loggedSessionMeta[session.session_type];
    const duration = getSessionDuration(session);
    const climbCount = session.climbs?.length || 0;
    const sendCount = session.climbs?.filter((climb) => climb.sent).length || 0;
    const summaryText = session.description || session.notes;

    return (
      <Link key={session.id} to={`/sessions/${session.id}`}>
        <Card className="card-elevated transition-all hover:border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('gap-1', meta.badgeClass)}>
                    {meta.icon}
                    {meta.label}
                  </Badge>
                  <span className="text-sm font-medium">
                    {format(parseISO(session.date), "EEE d MMM", { locale: es })}
                  </span>
                  {session.gyms?.name && (
                    <span className="text-xs text-muted-foreground">{session.gyms.name}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {duration > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {duration} min
                    </span>
                  )}
                  {session.distance_km ? (
                    <span className="flex items-center gap-1">
                      <Route className="h-3 w-3" />
                      {Number(session.distance_km).toFixed(1)} km
                    </span>
                  ) : null}
                  {session.rpe_1_10 ? (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      RPE {session.rpe_1_10}
                    </span>
                  ) : null}
                  {climbCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Mountain className="h-3 w-3" />
                      {sendCount}/{climbCount} tops
                    </span>
                  )}
                </div>

                {summaryText && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{summaryText}</p>
                )}
              </div>

              <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const Ts = {
    bg: '#050505', ink: '#FAFAF9', inkFaint: 'rgba(250,250,249,0.38)',
    rule: 'rgba(250,250,249,0.09)', sans: "'Urbanist', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', monospace",
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-20" style={{ background: Ts.bg, minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ padding: '28px 20px 0' }}>
          <div style={{ fontFamily: Ts.sans, fontSize: 10, color: Ts.inkFaint,
            textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: 10 }}>
            Planificación
          </div>
          <div style={{ fontFamily: Ts.sans, fontSize: 42, color: Ts.ink, lineHeight: 0.95,
            fontWeight: 700, letterSpacing: '-0.025em', textTransform: 'uppercase' }}>
            Calendario
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
          borderTop: `1px solid ${Ts.rule}`, borderBottom: `1px solid ${Ts.rule}`,
          margin: '20px 0 0' }}>
          {[
            { value: completedSessions.length, label: 'Completadas' },
            { value: pendingSessions.length, label: 'Pendientes' },
            { value: `${completedKm.toFixed(1)}`, label: 'km reales' },
            { value: `${totalPlannedKm.toFixed(1)}`, label: 'km plan.' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '14px 12px',
              borderRight: i < 3 ? `1px solid ${Ts.rule}` : 'none',
            }}>
              <div style={{ fontFamily: Ts.sans, fontSize: 22, color: Ts.ink,
                fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontFamily: Ts.sans, fontSize: 9, color: Ts.inkFaint,
                textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: 5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Completed Sessions List */}
        {completedSessions.length > 0 && (
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Sesiones completadas este mes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedSessions.map((session) => (
                (() => {
                  const { option } = getPlannedSessionMeta(session.session_type, session.notes);
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full', option.colorClass)} />
                        <div>
                          <div className="text-sm font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(session.date), "d 'de' MMMM", { locale: es })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {session.distance_km && (
                          <span className="flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            {session.distance_km} km
                          </span>
                        )}
                        {session.time_min && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.time_min} min
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()
              ))}
            </CardContent>
          </Card>
        )}

        {/* Calendar */}
        <Card className="card-elevated">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={month}
              onMonthChange={setMonth}
              locale={es}
              className="pointer-events-auto w-full"
              modifiers={{
                hasSession: (date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return !!datesWithSessions[dateStr];
                },
              }}
              modifiersStyles={{
                hasSession: {
                  fontWeight: 'bold',
                },
              }}
              components={{
                Day: ({ date, ...props }) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const sessionData = datesWithSessions[dateStr];
                  const isSelected = isSameDay(date, selectedDate);
                  const hasLoggedSession = datesWithLoggedSessions.has(dateStr);
                  
                  return (
                    <button
                      {...props}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        'relative w-full h-10 flex flex-col items-center justify-center rounded-md transition-colors',
                        isSelected && 'bg-primary text-primary-foreground',
                        hasLoggedSession && !isSelected && 'ring-1 ring-emerald-500/40 ring-inset',
                        !isSelected && 'hover:bg-accent'
                      )}
                    >
                      {hasLoggedSession && (
                        <span
                          className={cn(
                            'absolute right-1 top-1 h-1.5 w-1.5 rounded-full',
                            isSelected ? 'bg-primary-foreground/80' : 'bg-emerald-500',
                          )}
                        />
                      )}
                      <span>{date.getDate()}</span>
                      {sessionData && (
                        <div className="absolute bottom-1 flex gap-0.5">
                          {sessionData.focuses.slice(0, 3).map((focus, i) => (
                            <div
                              key={i}
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                planningOptions[focus].colorClass,
                                sessionData.completed && 'opacity-50'
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                },
              }}
            />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Sesión registrada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/70" />
                Puntos inferiores = planificadas
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Training Dashboard */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Carga y métricas</h2>
            <p className="text-sm text-muted-foreground">
              Resumen real de esta semana para planificar la siguiente con contexto
            </p>
          </div>

          {loggedSessionsLoading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Card key={item} className="card-elevated animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : loggedSessions.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Todavía no hay sesiones registradas para calcular carga ni métricas.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Card className="card-elevated">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Activity className="h-4 w-4 text-primary" />
                      Esta semana
                    </div>
                    <div className="text-2xl font-bold">
                      {trainingSummary.sessionsThisWeek.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {trainingSummary.weeklyMinutes} min acumulados
                    </p>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                      Carga 7d
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(trainingSummary.acuteLoad)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {trainingSummary.avgRpe > 0
                        ? `RPE medio ${trainingSummary.avgRpe.toFixed(1)}`
                        : 'Sin RPE registrado'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Footprints className="h-4 w-4 text-cyan-500" />
                      Running
                    </div>
                    <div className="text-2xl font-bold text-cyan-500">
                      {trainingSummary.runningKm.toFixed(1)} km
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(trainingSummary.runningGoalProgress)}% de {weeklyRunningGoal} km
                      {trainingSummary.runningElevation > 0 &&
                        ` · ${Math.round(trainingSummary.runningElevation)} m D+`}
                    </p>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Bike className="h-4 w-4 text-sky-500" />
                      Bici
                    </div>
                    <div className="text-2xl font-bold text-sky-500">
                      {trainingSummary.bikeKm.toFixed(1)} km
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {trainingSummary.bikeSessions} sesión
                      {trainingSummary.bikeSessions === 1 ? '' : 'es'}
                      {trainingSummary.bikeElevation > 0 &&
                        ` · ${Math.round(trainingSummary.bikeElevation)} m D+`}
                    </p>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Mountain className="h-4 w-4 text-orange-500" />
                      Escalada
                    </div>
                    <div className="text-2xl font-bold text-orange-500">
                      {trainingSummary.climbSends}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {trainingSummary.climbAttempts} intentos en {trainingSummary.climbSessions}{' '}
                      sesiones
                    </p>
                  </CardContent>
                </Card>
              </div>

              <TrainingLoadACWR sessions={loggedSessions} />
            </>
          )}
        </div>

        {/* Selected Date Sessions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva sesión planificada</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Tipo de sesión</Label>
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
                    <p className="text-xs text-muted-foreground">
                      {planningOptions[newSession.focus].description}
                    </p>
                  </div>

                  {planningOptions[newSession.focus].showGym && (
                    <div className="space-y-2">
                      <Label>Rocódromo o lugar</Label>
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

                  {planningOptions[newSession.focus].showTime && (
                    <div className="space-y-2">
                      <Label>
                        {newSession.focus === 'running' || newSession.focus === 'bike'
                          ? 'Tiempo (min)'
                          : 'Duración estimada (min)'}
                      </Label>
                      <Input
                        type="number"
                        placeholder={
                          newSession.focus === 'running' || newSession.focus === 'bike'
                            ? '60'
                            : '90'
                        }
                        value={newSession.time_min}
                        onChange={(e) => setNewSession({ ...newSession, time_min: e.target.value })}
                      />
                    </div>
                  )}

                  {planningOptions[newSession.focus].showDistance && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Distancia (km)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="10.5"
                          value={newSession.distance_km}
                          onChange={(e) => setNewSession({ ...newSession, distance_km: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Plan de la sesión — bloques o texto libre */}
                  {(newSession.focus === 'rope' || newSession.focus === 'boulder' || newSession.focus === 'hybrid') ? (
                    <div className="space-y-2">
                      {/* Tab bar */}
                      <div style={{ display: 'flex', borderBottom: '1px solid rgba(250,250,249,0.09)' }}>
                        {(['blocks', 'notes'] as const).map(tab => (
                          <button key={tab} onClick={() => setTemplateTab(tab)} style={{
                            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                            padding: '8px 0', fontFamily: "'Urbanist', sans-serif", fontSize: 10,
                            textTransform: 'uppercase', letterSpacing: '0.16em',
                            color: templateTab === tab ? '#FAFAF9' : 'rgba(250,250,249,0.38)',
                            fontWeight: templateTab === tab ? 600 : 500,
                            borderBottom: templateTab === tab ? '1px solid #FAFAF9' : '1px solid transparent',
                            marginBottom: -1,
                          }}>
                            {tab === 'blocks' ? 'Constructor' : 'Texto libre'}
                          </button>
                        ))}
                      </div>

                      {templateTab === 'blocks' ? (
                        <div className="space-y-3">
                          <TemplatePicker
                            sessionType={planningOptions[newSession.focus].sessionType}
                            onSelect={(blocks) => setSessionBlocks(blocks)}
                          />
                          {sessionBlocks.length > 0 && (
                            <div>
                              <div style={{
                                fontFamily: "'Urbanist', sans-serif", fontSize: 10,
                                color: 'rgba(250,250,249,0.5)', textTransform: 'uppercase',
                                letterSpacing: '0.14em', marginBottom: 8,
                              }}>Editar bloques de esta sesión</div>
                              <TemplateBuilder blocks={sessionBlocks} onChange={setSessionBlocks} />
                            </div>
                          )}
                          {sessionBlocks.length === 0 && (
                            <div>
                              <div style={{
                                fontFamily: "'Urbanist', sans-serif", fontSize: 10,
                                color: 'rgba(250,250,249,0.5)', textTransform: 'uppercase',
                                letterSpacing: '0.14em', marginBottom: 8,
                              }}>O crea bloques desde cero</div>
                              <TemplateBuilder blocks={sessionBlocks} onChange={setSessionBlocks} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <Textarea
                          value={newSession.trainer_notes}
                          onChange={(e) => setNewSession({ ...newSession, trainer_notes: e.target.value })}
                          placeholder="Objetivo, bloques, series, repeticiones, ritmo o descansos..."
                          rows={4}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Plan de la sesión</Label>
                      <Textarea
                        value={newSession.trainer_notes}
                        onChange={(e) => setNewSession({ ...newSession, trainer_notes: e.target.value })}
                        placeholder="Objetivo, bloques, series, repeticiones, ritmo o descansos..."
                        rows={3}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Mis notas</Label>
                    <Textarea
                      value={newSession.notes}
                      onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                      placeholder="Notas personales..."
                      rows={2}
                    />
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                  >
                    Añadir sesión
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {selectedDateSessions.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="p-6 text-center text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay sesiones planificadas para este día</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedDateSessions.map((session) => {
                const { notes, option, focus } = getPlannedSessionMeta(
                  session.session_type,
                  session.notes,
                );

                return (
                  <Card
                    key={session.id}
                    className={cn(
                      'card-elevated transition-opacity',
                      session.completed && 'opacity-60'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={cn('text-white gap-1', option.colorClass)}>
                              {planningIcons[focus]}
                              {option.label}
                            </Badge>
                            {session.completed && (
                              <Badge variant="secondary">
                                <Check className="h-3 w-3 mr-1" />
                                Completada
                              </Badge>
                            )}
                          </div>

                          {session.trainer_notes && (() => {
                            let blocks: TemplateBlock[] | null = null;
                            try { blocks = JSON.parse(session.trainer_notes); } catch {}
                            if (blocks && Array.isArray(blocks) && blocks.length > 0) {
                              const BCOLOR: Record<string, string> = {
                                warmup: 'rgba(251,191,36,0.2)',
                                main: 'rgba(226,58,31,0.2)',
                                cooldown: 'rgba(99,102,241,0.2)',
                              };
                              const BLABEL: Record<string, string> = {
                                warmup: 'Cal.', main: 'Prin.', cooldown: 'Vta.',
                              };
                              return (
                                <div className="mb-2 space-y-1">
                                  {blocks.map((b, idx) => (
                                    <div key={idx} style={{
                                      display: 'flex', alignItems: 'center', gap: 6,
                                      padding: '4px 8px', background: BCOLOR[b.type] || 'rgba(250,250,249,0.06)',
                                    }}>
                                      <span style={{
                                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                                        color: 'rgba(250,250,249,0.4)', textTransform: 'uppercase',
                                        letterSpacing: '0.1em', flexShrink: 0, minWidth: 28,
                                      }}>{BLABEL[b.type]}</span>
                                      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: 12, color: 'rgba(250,250,249,0.85)', flex: 1 }}>
                                        {b.label || ''}
                                        {b.optional && <span style={{ color: 'rgba(250,250,249,0.35)', fontSize: 10 }}> (opc.)</span>}
                                      </span>
                                      {(b.sets || b.grade) && (
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(250,250,249,0.6)', flexShrink: 0 }}>
                                          {b.sets ? `${b.sets}×` : ''}{b.grade ? ` ${b.grade}` : ''}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return (
                              <div className="mb-2">
                                <p className="text-xs text-muted-foreground font-medium mb-1">
                                  <Dumbbell className="h-3 w-3 inline mr-1" />
                                  Plan:
                                </p>
                                <p className="text-sm">{session.trainer_notes}</p>
                              </div>
                            );
                          })()}

                          {(session.distance_km || session.time_min || session.gyms?.name) && (
                            <div className="flex flex-wrap gap-3 mb-2 text-sm">
                              {session.gyms?.name && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {session.gyms.name}
                                </span>
                              )}
                              {session.distance_km && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Route className="h-3 w-3" />
                                  {session.distance_km} km
                                </span>
                              )}
                              {session.time_min && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {session.time_min} min
                                </span>
                              )}
                            </div>
                          )}

                          {notes && (
                            <p className="text-sm text-muted-foreground">{notes}</p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingSession(session)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant={session.completed ? 'secondary' : 'default'}
                            className="h-8 w-8"
                            onClick={() =>
                              toggleCompletedMutation.mutate({
                                id: session.id,
                                completed: !session.completed,
                              })
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          {!session.completed && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm('¿Eliminar esta sesión planificada?')) {
                                  deleteMutation.mutate(session.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Logged Sessions Context */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Sesiones anteriores</h2>
            <p className="text-sm text-muted-foreground">
              Historial real para ajustar la semana según lo que ya vienes cargando
            </p>
          </div>

          {loggedSessionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <Card key={item} className="card-elevated animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : loggedSessions.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="p-6 text-center text-muted-foreground">
                <CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Cuando registres sesiones, aquí verás tu histórico reciente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {selectedDateLoggedSessions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Registradas en esta fecha
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {selectedDateLoggedSessions.length} sesión
                      {selectedDateLoggedSessions.length > 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {selectedDateLoggedSessions.map((session) => renderLoggedSessionCard(session))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Antes del {format(selectedDate, "d 'de' MMMM", { locale: es })}
                  </h3>
                  <span className="text-xs text-muted-foreground">Últimas 6</span>
                </div>

                {previousLoggedSessions.length === 0 ? (
                  <Card className="card-elevated">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <p>No hay sesiones previas a la fecha seleccionada.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {previousLoggedSessions.map((session) => renderLoggedSessionCard(session))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditPlannedSessionDialog
        session={editingSession}
        open={!!editingSession}
        onOpenChange={(open) => !open && setEditingSession(null)}
      />
    </AppLayout>
  );
}
