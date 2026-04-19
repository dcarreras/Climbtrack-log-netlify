import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, Clock, Pause, Play, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getPlannedSessionMeta } from '@/lib/planning';
import {
  buildBoulderPlanFromTemplateBlocks,
  createBoulderPlanItem,
  expandBoulderPlan,
  summarizeBoulderPlan,
  type BoulderPlanItem,
} from '@/lib/boulderPlan';
import {
  buildRoutePlanFromTemplateBlocks,
  createRoutePlanItem,
  expandRoutePlan,
  type RoutePlanItem,
} from '@/lib/routePlan';
import {
  clearActiveRouteStorage,
  getActiveRouteSnapshot,
  saveActiveRouteSnapshot,
  setStoredActiveSessionId,
} from '@/lib/routeSessionStorage';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import PlannedSessionStep from './steps/PlannedSessionStep';
import SessionTypeStep, { type SessionTypeValue } from './steps/SessionTypeStep';
import ClimbCountStep from './steps/ClimbCountStep';
import ClimbInputStep, { type ClimbData } from './steps/ClimbInputStep';
import SessionDetailsStep, { type SessionDetailsData } from './steps/SessionDetailsStep';
import WeightStep from './steps/WeightStep';
import RoutePlanStep from './steps/RoutePlanStep';
import RoutePlanConfirmStep from './steps/RoutePlanConfirmStep';
import ActiveRouteSessionStep from './steps/ActiveRouteSessionStep';
import RouteFinishStep from './steps/RouteFinishStep';
import BoulderPlanStep from './steps/BoulderPlanStep';
import BoulderPlanConfirmStep from './steps/BoulderPlanConfirmStep';
import ActiveBoulderSessionStep from './steps/ActiveBoulderSessionStep';
import BoulderFinishStep from './steps/BoulderFinishStep';
import StravaOnlyStep from './steps/StravaOnlyStep';
import { uploadSessionPhotos } from './QuickPhotoCapture';
import type { Database, Tables } from '@/integrations/supabase/types';

type SessionType = Database['public']['Enums']['session_type'];

type WizardStep =
  | 'planned'
  | 'type'
  | 'count'
  | 'climbs'
  | 'details'
  | 'weight'
  | 'boulder-plan'
  | 'boulder-confirm'
  | 'boulder-active'
  | 'boulder-finish'
  | 'strava-only'
  | 'route-plan'
  | 'route-confirm'
  | 'route-active'
  | 'route-finish';

const DRAFT_STORAGE_KEY = 'climbtracker.sessionDraft';

interface SessionDraft {
  boulderPlan: BoulderPlanItem[];
  bodyWeight: string;
  climbCount: number;
  climbs: ClimbData[];
  durationLocked: boolean;
  elapsedMs: number;
  plannedSessionId: string | null;
  routePlan: RoutePlanItem[];
  sessionDetails: SessionDetailsData;
  sessionType: SessionTypeValue;
  step: WizardStep;
  timerStarted: boolean;
}

type SelectedPlannedSession = Pick<
  Tables<'planned_sessions'>,
  'date' | 'gym_id' | 'id' | 'notes' | 'session_type' | 'trainer_notes'
>;

const LEGACY_TIMER_STEPS: WizardStep[] = ['type', 'count', 'climbs', 'details', 'weight'];
const ACTIVE_SESSION_STEPS: WizardStep[] = [
  'route-active',
  'route-finish',
  'boulder-active',
  'boulder-finish',
];

export default function SessionWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<WizardStep>('planned');
  const [plannedSessionId, setPlannedSessionId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<SessionTypeValue>('boulder');
  const [climbCount, setClimbCount] = useState(5);
  const [climbs, setClimbs] = useState<ClimbData[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [boulderPlan, setBoulderPlan] = useState<BoulderPlanItem[]>([createBoulderPlanItem()]);
  const [boulderPlanWarnings, setBoulderPlanWarnings] = useState<string[]>([]);
  const [routePlan, setRoutePlan] = useState<RoutePlanItem[]>([createRoutePlanItem()]);
  const [activeClimbSessionId, setActiveClimbSessionId] = useState<string | null>(null);
  const [activeClimbSessionType, setActiveClimbSessionType] = useState<'boulder' | 'rope' | null>(
    null,
  );
  const [boulderPlanSourceId, setBoulderPlanSourceId] = useState<string | null>(null);
  const [routePlanSourceId, setRoutePlanSourceId] = useState<string | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationLocked, setDurationLocked] = useState(false);
  const timerStartRef = useRef<number | null>(null);
  const timerPausedAtRef = useRef<number | null>(null);
  const timerPausedTotalRef = useRef(0);
  const [sessionDetails, setSessionDetails] = useState<SessionDetailsData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    gymId: null,
    durationMin: 90,
    mood: '',
    notes: '',
    rpe: 6,
  });
  const [bodyWeight, setBodyWeight] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [draftSnapshot, setDraftSnapshot] = useState<SessionDraft | null>(null);

  const activeSessionQuery = useQuery({
    queryKey: ['active-session-summary', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, session_type, status')
        .eq('user_id', user!.id)
        .eq('status', 'in_progress')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const selectedPlannedSessionQuery = useQuery({
    queryKey: ['selected-planned-session', plannedSessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planned_sessions')
        .select('id, session_type, trainer_notes, notes, gym_id, date')
        .eq('id', plannedSessionId!)
        .maybeSingle();

      if (error) throw error;
      return data as SelectedPlannedSession | null;
    },
    enabled: !!plannedSessionId,
  });

  const formatElapsed = (milliseconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const timerMinutes = Math.min(240, Math.max(5, Math.round(elapsedMs / 60000)));
  const isActiveSessionFlow = ACTIVE_SESSION_STEPS.includes(step);
  const plannedSessionLabel = selectedPlannedSessionQuery.data
    ? getPlannedSessionMeta(
        selectedPlannedSessionQuery.data.session_type,
        selectedPlannedSessionQuery.data.notes,
      ).option.label
    : null;

  useEffect(() => {
    if (!activeSessionQuery.isSuccess) return;

    const activeSession = activeSessionQuery.data;

    if (activeSession?.session_type === 'rope' || activeSession?.session_type === 'boulder') {
      setActiveClimbSessionId(activeSession.id);
      setActiveClimbSessionType(activeSession.session_type);
      setStoredActiveSessionId(activeSession.id);

      const snapshot = getActiveRouteSnapshot();
      if (snapshot?.sessionId === activeSession.id && snapshot.step === 'finish') {
        setStep(activeSession.session_type === 'rope' ? 'route-finish' : 'boulder-finish');
      } else {
        setStep(activeSession.session_type === 'rope' ? 'route-active' : 'boulder-active');
      }

      return;
    }

    clearActiveRouteStorage();
    setActiveClimbSessionId(null);
    setActiveClimbSessionType(null);

    if (ACTIVE_SESSION_STEPS.includes(step)) {
      setStep('planned');
    }
  }, [activeSessionQuery.data, activeSessionQuery.isSuccess, step]);

  useEffect(() => {
    if (activeClimbSessionId && ACTIVE_SESSION_STEPS.includes(step)) {
      setStoredActiveSessionId(activeClimbSessionId);
      saveActiveRouteSnapshot({
        sessionId: activeClimbSessionId,
        step: step === 'route-finish' || step === 'boulder-finish' ? 'finish' : 'active',
        updatedAt: new Date().toISOString(),
      });
    }
  }, [activeClimbSessionId, step]);

  useEffect(() => {
    if (activeSessionQuery.isLoading || activeClimbSessionId) return;

    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as SessionDraft;
      if (!parsed || !parsed.sessionDetails) return;
      setDraftSnapshot(parsed);
      setShowRestoreDialog(true);
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [activeClimbSessionId, activeSessionQuery.isLoading]);

  useEffect(() => {
    if (!selectedPlannedSessionQuery.data || sessionType !== 'rope') return;
    if (routePlanSourceId === selectedPlannedSessionQuery.data.id) return;

    const extractedRoutePlan = buildRoutePlanFromTemplateBlocks(
      selectedPlannedSessionQuery.data.trainer_notes,
    );

    setRoutePlan(extractedRoutePlan.length > 0 ? extractedRoutePlan : [createRoutePlanItem()]);
    setRoutePlanSourceId(selectedPlannedSessionQuery.data.id);
  }, [routePlanSourceId, selectedPlannedSessionQuery.data, sessionType]);

  useEffect(() => {
    if (sessionType !== 'rope' || plannedSessionId) return;
    if (routePlanSourceId === null) return;

    setRoutePlan([createRoutePlanItem()]);
    setRoutePlanSourceId(null);
  }, [plannedSessionId, routePlanSourceId, sessionType]);

  useEffect(() => {
    if (!selectedPlannedSessionQuery.data || sessionType !== 'boulder') return;
    if (boulderPlanSourceId === selectedPlannedSessionQuery.data.id) return;

    const extractedBoulderPlan = buildBoulderPlanFromTemplateBlocks(
      selectedPlannedSessionQuery.data.trainer_notes,
    );

    setBoulderPlan(
      extractedBoulderPlan.plan.length > 0 ? extractedBoulderPlan.plan : [createBoulderPlanItem()],
    );
    setBoulderPlanWarnings(extractedBoulderPlan.ignoredValues);
    setBoulderPlanSourceId(selectedPlannedSessionQuery.data.id);
  }, [boulderPlanSourceId, selectedPlannedSessionQuery.data, sessionType]);

  useEffect(() => {
    if (sessionType !== 'boulder' || plannedSessionId) return;
    if (boulderPlanSourceId === null && boulderPlanWarnings.length === 0) return;

    setBoulderPlan([createBoulderPlanItem()]);
    setBoulderPlanWarnings([]);
    setBoulderPlanSourceId(null);
  }, [boulderPlanSourceId, boulderPlanWarnings.length, plannedSessionId, sessionType]);

  useEffect(() => {
    if (!timerStarted && LEGACY_TIMER_STEPS.includes(step)) {
      timerStartRef.current = Date.now();
      timerPausedAtRef.current = null;
      timerPausedTotalRef.current = 0;
      setElapsedMs(0);
      setTimerRunning(true);
      setTimerStarted(true);
    }
  }, [step, timerStarted]);

  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      const start = timerStartRef.current ?? Date.now();
      const paused = timerPausedTotalRef.current;
      setElapsedMs(Date.now() - start - paused);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleToggleTimer = () => {
    if (!timerRunning) {
      if (timerPausedAtRef.current) {
        timerPausedTotalRef.current += Date.now() - timerPausedAtRef.current;
        timerPausedAtRef.current = null;
      }
      setTimerRunning(true);
      return;
    }

    const start = timerStartRef.current ?? Date.now();
    const paused = timerPausedTotalRef.current;
    setElapsedMs(Date.now() - start - paused);
    timerPausedAtRef.current = Date.now();
    setTimerRunning(false);
  };

  const handleUseTimerDuration = () => {
    setDurationLocked(false);
    setSessionDetails((previous) => ({ ...previous, durationMin: timerMinutes }));
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftSnapshot(null);
  };

  const saveDraft = () => {
    const draft: SessionDraft = {
      boulderPlan,
      bodyWeight,
      climbCount,
      climbs,
      durationLocked,
      elapsedMs,
      plannedSessionId,
      routePlan,
      sessionDetails,
      sessionType,
      step,
      timerStarted: timerStarted || elapsedMs > 0,
    };

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setDraftSnapshot(draft);
  };

  const restoreDraft = () => {
    if (!draftSnapshot) return;

    setStep(draftSnapshot.step);
    setPlannedSessionId(draftSnapshot.plannedSessionId);
    setSessionType(draftSnapshot.sessionType);
    setBoulderPlan(
      draftSnapshot.boulderPlan?.length ? draftSnapshot.boulderPlan : [createBoulderPlanItem()],
    );
    setClimbCount(draftSnapshot.climbCount || 1);
    setClimbs(draftSnapshot.climbs ?? []);
    setRoutePlan(draftSnapshot.routePlan?.length ? draftSnapshot.routePlan : [createRoutePlanItem()]);
    setPhotos([]);
    setSessionDetails(draftSnapshot.sessionDetails);
    setBodyWeight(draftSnapshot.bodyWeight);
    setDurationLocked(draftSnapshot.durationLocked);
    setElapsedMs(draftSnapshot.elapsedMs);
    setTimerStarted(draftSnapshot.timerStarted || draftSnapshot.elapsedMs > 0);
    setTimerRunning(false);
    timerStartRef.current = Date.now() - (draftSnapshot.elapsedMs || 0);
    timerPausedTotalRef.current = 0;
    timerPausedAtRef.current = Date.now();
    setShowRestoreDialog(false);
  };

  const discardDraft = () => {
    clearDraft();
    setShowRestoreDialog(false);
  };

  const handleSaveAndExit = () => {
    saveDraft();
    toast('Borrador guardado', {
      description: 'Puedes continuar el registro más tarde desde esta misma pantalla.',
      duration: 3000,
    });
    navigate('/home');
  };

  const handlePlannedSessionChange = (id: string | null, type?: string) => {
    setPlannedSessionId(id);

    if (type) {
      setSessionType(type as SessionTypeValue);
    }
  };

  const initializeClimbs = (count: number) => {
    const defaultType = sessionType === 'boulder' ? 'boulder' : 'autobelay';
    const nextClimbs: ClimbData[] = Array(count)
      .fill(null)
      .map(() => ({
        attempts: 1,
        colorBand: null,
        flash: false,
        gradeValue: null,
        sendType: 'flash' as const,
        sent: true,
        tags: [],
        type: defaultType,
      }));

    setClimbs(nextClimbs);
    setClimbCount(count);
  };

  const createLegacySession = useMutation({
    mutationFn: async () => {
      const dbSessionType: SessionType = sessionType === 'training' ? 'training' : sessionType;
      const durationMin = durationLocked || !timerStarted ? sessionDetails.durationMin : timerMinutes;

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          body_weight_kg: bodyWeight ? Number.parseFloat(bodyWeight) : null,
          date: sessionDetails.date,
          duration_min: durationMin,
          gym_id: sessionDetails.gymId,
          mood: sessionDetails.mood || null,
          notes: sessionDetails.notes || null,
          rpe_1_10: sessionDetails.rpe,
          session_type: dbSessionType,
          user_id: user!.id,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      if (climbs.length > 0) {
        const climbsToInsert = climbs.map((climb) => ({
          attempts: climb.attempts || 1,
          color_band: climb.type === 'boulder' ? climb.colorBand : null,
          discipline: climb.type === 'boulder' ? ('boulder' as const) : ('route' as const),
          grade_system:
            climb.type === 'autobelay' || climb.type === 'rope' ? ('french' as const) : null,
          grade_value:
            climb.type === 'autobelay' || climb.type === 'rope' ? climb.gradeValue : null,
          notes: `[${climb.type === 'autobelay' ? 'Autobelay' : climb.type === 'rope' ? 'Cuerda' : 'Boulder'}]`,
          sent: climb.sent,
          session_id: session.id,
          tags: climb.tags || [],
          flash: climb.flash,
        }));

        const { error: climbsError } = await supabase.from('climbs').insert(climbsToInsert);
        if (climbsError) throw climbsError;
      }

      if (plannedSessionId) {
        await supabase
          .from('planned_sessions')
          .update({
            completed: true,
            completed_session_id: session.id,
          })
          .eq('id', plannedSessionId);
      }

      let photoUploadResult = { failedCount: 0, uploadedCount: 0 };
      if (photos.length > 0) {
        photoUploadResult = await uploadSessionPhotos(photos, session.id, user!.id);
      }

      return { photoUploadResult, session };
    },
    onSuccess: ({ photoUploadResult, session }) => {
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['planned-sessions-pending'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      clearDraft();

      const photoMessage =
        photoUploadResult.uploadedCount > 0
          ? ` y ${photoUploadResult.uploadedCount} foto(s)`
          : '';

      toast.success('¡Sesión guardada!', {
        icon: <Check className="h-4 w-4 text-green-500" />,
        description: `Se han registrado ${climbs.length} escaladas${photoMessage} correctamente.`,
        duration: 4000,
      });

      if (photoUploadResult.failedCount > 0) {
        toast.warning(
          `La sesión quedó guardada, pero ${photoUploadResult.failedCount} foto(s) no pudieron subirse.`,
        );
      }

      navigate(`/sessions/${session.id}`);
    },
    onError: (error) => {
      toast.error('Error al guardar la sesión: ' + error.message);
    },
  });

  const startRouteSession = useMutation({
    mutationFn: async () => {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          date: format(new Date(), 'yyyy-MM-dd'),
          gym_id: selectedPlannedSessionQuery.data?.gym_id || null,
          paused_ms: 0,
          planned_session_id: selectedPlannedSessionQuery.data?.id || null,
          session_type: 'rope',
          started_at: new Date().toISOString(),
          status: 'in_progress',
          user_id: user!.id,
        })
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      const climbsToInsert = expandRoutePlan(routePlan).map((item) => ({
        attempts: 1,
        discipline: 'route' as const,
        flash: false,
        grade_system: 'french' as const,
        grade_value: item.grade,
        order_index: item.orderIndex,
        sent: false,
        session_id: session.id,
      }));

      const { error: climbsError } = await supabase.from('climbs').insert(climbsToInsert);
      if (climbsError) throw climbsError;

      return session.id;
    },
    onSuccess: (sessionId) => {
      clearDraft();
      setActiveClimbSessionId(sessionId);
      setActiveClimbSessionType('rope');
      setStoredActiveSessionId(sessionId);
      saveActiveRouteSnapshot({
        sessionId,
        step: 'active',
        updatedAt: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['active-session-summary', user?.id] });
      setStep('route-active');
      toast.success('Sesión activa iniciada');
    },
    onError: (error) => {
      toast.error('No se pudo iniciar la sesión: ' + error.message);
    },
  });

  const startBoulderSession = useMutation({
    mutationFn: async () => {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          date: format(new Date(), 'yyyy-MM-dd'),
          gym_id: selectedPlannedSessionQuery.data?.gym_id || null,
          paused_ms: 0,
          planned_session_id: selectedPlannedSessionQuery.data?.id || null,
          session_type: 'boulder',
          started_at: new Date().toISOString(),
          status: 'in_progress',
          user_id: user!.id,
        })
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      const climbsToInsert = expandBoulderPlan(boulderPlan).map((item) => ({
        attempts: 0,
        color_band: item.colorBand,
        discipline: 'boulder' as const,
        flash: false,
        order_index: item.orderIndex,
        sent: false,
        session_id: session.id,
      }));

      const { error: climbsError } = await supabase.from('climbs').insert(climbsToInsert);
      if (climbsError) throw climbsError;

      return session.id;
    },
    onSuccess: (sessionId) => {
      clearDraft();
      setActiveClimbSessionId(sessionId);
      setActiveClimbSessionType('boulder');
      setStoredActiveSessionId(sessionId);
      saveActiveRouteSnapshot({
        sessionId,
        step: 'active',
        updatedAt: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['active-session-summary', user?.id] });
      setStep('boulder-active');
      toast.success('Sesión activa iniciada');
    },
    onError: (error) => {
      toast.error('No se pudo iniciar la sesión: ' + error.message);
    },
  });

  const handleTypeNext = () => {
    if (sessionType === 'training') {
      setStep('details');
      return;
    }

    if (sessionType === 'running' || sessionType === 'bike') {
      setStep('strava-only');
      return;
    }

    if (sessionType === 'boulder') {
      setStep('boulder-plan');
      return;
    }

    if (sessionType === 'rope') {
      setStep('route-plan');
      return;
    }

    setStep('count');
  };

  const handleCountNext = () => {
    initializeClimbs(climbCount);
    setStep('climbs');
  };

  const handleCancel = () => {
    clearDraft();
    navigate('/home');
  };

  const handleActiveSessionDiscarded = () => {
    setActiveClimbSessionId(null);
    setActiveClimbSessionType(null);
    setPlannedSessionId(null);
    setBoulderPlan([createBoulderPlanItem()]);
    setBoulderPlanWarnings([]);
    setBoulderPlanSourceId(null);
    setRoutePlan([createRoutePlanItem()]);
    setRoutePlanSourceId(null);
    setStep('planned');
    queryClient.invalidateQueries({ queryKey: ['active-session-summary', user?.id] });
  };

  const handleActiveSessionCompleted = (sessionId: string) => {
    setActiveClimbSessionId(null);
    setActiveClimbSessionType(null);
    queryClient.invalidateQueries({ queryKey: ['active-session-summary', user?.id] });
    navigate(`/sessions/${sessionId}`);
  };

  return (
    <div className="max-w-xl mx-auto">
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay un borrador guardado</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Quieres restaurarlo? Las fotos no se pueden recuperar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardDraft}>Descartar</AlertDialogCancel>
            <AlertDialogAction onClick={restoreDraft}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isActiveSessionFlow && (
        <div className="flex justify-end mb-4">
          {timerStarted && LEGACY_TIMER_STEPS.includes(step) && (
            <div className="mr-auto flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm">{formatElapsed(elapsedMs)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleToggleTimer}
              >
                {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span className="ml-1">{timerRunning ? 'Pausar' : 'Reanudar'}</span>
              </Button>
            </div>
          )}

          <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cerrar registro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Si sales ahora, el registro se cerrará. ¿Quieres guardar los datos para más adelante?
                  Las fotos no se guardan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Seguir registrando</AlertDialogCancel>
                <AlertDialogAction onClick={handleSaveAndExit}>Guardar y salir</AlertDialogAction>
                <AlertDialogAction
                  onClick={handleCancel}
                  className="bg-destructive text-destructive-foreground"
                >
                  Salir sin guardar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {step === 'planned' && (
        <PlannedSessionStep
          value={plannedSessionId}
          onChange={handlePlannedSessionChange}
          onNext={() => (plannedSessionId ? handleTypeNext() : setStep('type'))}
        />
      )}

      {step === 'type' && (
        <SessionTypeStep
          value={sessionType}
          onChange={setSessionType}
          onNext={handleTypeNext}
          onBack={() => setStep('planned')}
        />
      )}

      {step === 'boulder-plan' && (
        <BoulderPlanStep
          value={boulderPlan}
          onChange={setBoulderPlan}
          onNext={() => setStep('boulder-confirm')}
          onBack={() => setStep('type')}
          plannedHint={
            selectedPlannedSessionQuery.data?.trainer_notes
              ? summarizeBoulderPlan(
                  buildBoulderPlanFromTemplateBlocks(selectedPlannedSessionQuery.data.trainer_notes)
                    .plan,
                )
              : null
          }
          plannedWarnings={boulderPlanWarnings}
        />
      )}

      {step === 'boulder-confirm' && (
        <BoulderPlanConfirmStep
          value={boulderPlan}
          plannedSessionLabel={plannedSessionLabel}
          onBack={() => setStep('boulder-plan')}
          onStart={() => startBoulderSession.mutate()}
        />
      )}

      {step === 'route-plan' && (
        <RoutePlanStep
          value={routePlan}
          onChange={setRoutePlan}
          onNext={() => setStep('route-confirm')}
          onBack={() => setStep('type')}
          plannedHint={
            selectedPlannedSessionQuery.data?.trainer_notes
              ? buildRoutePlanFromTemplateBlocks(selectedPlannedSessionQuery.data.trainer_notes)
                  .map((item) => `${item.count}x${item.grade}`)
                  .join(', ')
              : null
          }
        />
      )}

      {step === 'route-confirm' && (
        <RoutePlanConfirmStep
          value={routePlan}
          plannedSessionLabel={plannedSessionLabel}
          onBack={() => setStep('route-plan')}
          onStart={() => startRouteSession.mutate()}
        />
      )}

      {step === 'boulder-active' &&
        activeClimbSessionId &&
        activeClimbSessionType === 'boulder' && (
          <ActiveBoulderSessionStep
            sessionId={activeClimbSessionId}
            onFinishRequested={() => setStep('boulder-finish')}
            onDiscarded={handleActiveSessionDiscarded}
          />
        )}

      {step === 'boulder-finish' &&
        activeClimbSessionId &&
        activeClimbSessionType === 'boulder' && (
          <BoulderFinishStep
            sessionId={activeClimbSessionId}
            onBack={() => setStep('boulder-active')}
            onCompleted={handleActiveSessionCompleted}
          />
        )}

      {step === 'route-active' &&
        activeClimbSessionId &&
        activeClimbSessionType === 'rope' && (
        <ActiveRouteSessionStep
          sessionId={activeClimbSessionId}
          onFinishRequested={() => setStep('route-finish')}
          onDiscarded={handleActiveSessionDiscarded}
        />
      )}

      {step === 'route-finish' &&
        activeClimbSessionId &&
        activeClimbSessionType === 'rope' && (
        <RouteFinishStep
          sessionId={activeClimbSessionId}
          onBack={() => setStep('route-active')}
          onCompleted={handleActiveSessionCompleted}
        />
      )}

      {step === 'count' && (
        <ClimbCountStep
          sessionType={sessionType}
          count={climbCount}
          onChange={setClimbCount}
          onNext={handleCountNext}
          onBack={() => setStep('type')}
        />
      )}

      {step === 'climbs' && (
        <ClimbInputStep
          sessionType={sessionType}
          totalClimbs={climbCount}
          climbs={climbs}
          onChange={setClimbs}
          onNext={() => setStep('details')}
          onBack={() => setStep('count')}
          photos={photos}
          onPhotosChange={setPhotos}
        />
      )}

      {step === 'details' && (
        <SessionDetailsStep
          value={sessionDetails}
          onChange={setSessionDetails}
          onDurationChange={() => setDurationLocked(true)}
          onUseTimerDuration={handleUseTimerDuration}
          timerLabel={timerStarted ? formatElapsed(elapsedMs) : undefined}
          timerMinutes={timerMinutes}
          onNext={() => setStep('weight')}
          onBack={() => (sessionType === 'training' ? setStep('type') : setStep('climbs'))}
        />
      )}

      {step === 'weight' && (
        <WeightStep
          value={bodyWeight}
          onChange={setBodyWeight}
          onSubmit={() => createLegacySession.mutate()}
          onBack={() => setStep('details')}
          isSubmitting={createLegacySession.isPending}
        />
      )}

      {step === 'strava-only' && (sessionType === 'running' || sessionType === 'bike') && (
        <StravaOnlyStep
          activityType={sessionType}
          plannedSessionLabel={plannedSessionLabel}
          onBack={() => setStep(plannedSessionId ? 'planned' : 'type')}
          onOpenProfile={() => navigate('/profile')}
        />
      )}
    </div>
  );
}
