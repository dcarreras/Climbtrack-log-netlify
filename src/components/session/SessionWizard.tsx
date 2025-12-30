import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Check, Clock, Pause, Play, X } from 'lucide-react';
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
import RunningSessionForm from './RunningSessionForm';
import { uploadSessionPhotos } from './QuickPhotoCapture';
import type { Database } from '@/integrations/supabase/types';

type SessionType = Database['public']['Enums']['session_type'];

type WizardStep = 'planned' | 'type' | 'count' | 'climbs' | 'details' | 'weight' | 'running';

const DRAFT_STORAGE_KEY = 'climbtracker.sessionDraft';

interface SessionDraft {
  step: WizardStep;
  plannedSessionId: string | null;
  sessionType: SessionTypeValue;
  climbCount: number;
  climbs: ClimbData[];
  sessionDetails: SessionDetailsData;
  bodyWeight: string;
  elapsedMs: number;
  timerStarted: boolean;
  durationLocked: boolean;
}

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
    rpe: 6,
    mood: '',
    notes: '',
  });
  const [bodyWeight, setBodyWeight] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [draftSnapshot, setDraftSnapshot] = useState<SessionDraft | null>(null);

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const timerMinutes = Math.min(240, Math.max(5, Math.round(elapsedMs / 60000)));

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!timerStarted && step !== 'planned') {
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
    setSessionDetails((prev) => ({ ...prev, durationMin: timerMinutes }));
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftSnapshot(null);
  };

  const saveDraft = () => {
    const draft: SessionDraft = {
      step,
      plannedSessionId,
      sessionType,
      climbCount,
      climbs,
      sessionDetails,
      bodyWeight,
      elapsedMs,
      timerStarted: timerStarted || elapsedMs > 0,
      durationLocked,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setDraftSnapshot(draft);
  };

  const restoreDraft = () => {
    if (!draftSnapshot) return;
    const draft = draftSnapshot;
    setStep(draft.step);
    setPlannedSessionId(draft.plannedSessionId);
    setSessionType(draft.sessionType);
    setClimbCount(draft.climbCount || 1);
    setClimbs(draft.climbs ?? []);
    setPhotos([]);
    setSessionDetails(draft.sessionDetails);
    setBodyWeight(draft.bodyWeight);
    setDurationLocked(draft.durationLocked);
    setElapsedMs(draft.elapsedMs);
    setTimerStarted(draft.timerStarted || draft.elapsedMs > 0);
    setTimerRunning(false);
    timerStartRef.current = Date.now() - (draft.elapsedMs || 0);
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
      description: 'Puedes continuar el registro mas tarde desde esta misma pantalla.',
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

  // Initialize climbs array when count changes
  const initializeClimbs = (count: number) => {
    const defaultType = sessionType === 'boulder' ? 'boulder' : 'autobelay';
    const newClimbs: ClimbData[] = Array(count).fill(null).map(() => ({
      type: defaultType,
      colorBand: null,
      gradeValue: null,
      sent: true,
      flash: false,
      attempts: 1,
      sendType: 'flash' as const,
      tags: [],
    }));
    setClimbs(newClimbs);
    setClimbCount(count);
  };

  const createSession = useMutation({
    mutationFn: async () => {
      // Map session type
      const dbSessionType: SessionType = sessionType === 'training' ? 'training' : sessionType;

      // Create session
      const durationMin = durationLocked || !timerStarted ? sessionDetails.durationMin : timerMinutes;
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user!.id,
          date: sessionDetails.date,
          gym_id: sessionDetails.gymId,
          session_type: dbSessionType,
          duration_min: durationMin,
          rpe_1_10: sessionDetails.rpe,
          body_weight_kg: bodyWeight ? parseFloat(bodyWeight) : null,
          mood: sessionDetails.mood || null,
          notes: sessionDetails.notes || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create climbs
      if (climbs.length > 0) {
        const climbsToInsert = climbs.map((climb) => ({
          session_id: session.id,
          discipline: climb.type === 'boulder' ? 'boulder' as const : 'route' as const,
          color_band: climb.type === 'boulder' ? climb.colorBand : null,
          grade_system: (climb.type === 'autobelay' || climb.type === 'rope') ? 'french' as const : null,
          grade_value: (climb.type === 'autobelay' || climb.type === 'rope') ? climb.gradeValue : null,
          sent: climb.sent,
          flash: climb.flash,
          attempts: climb.attempts || 1,
          tags: climb.tags || [],
          notes: `[${climb.type === 'autobelay' ? 'Autobelay' : climb.type === 'rope' ? 'Cuerda' : 'Boulder'}]`,
        }));

        const { error: climbsError } = await supabase
          .from('climbs')
          .insert(climbsToInsert);

        if (climbsError) throw climbsError;
      }

      // Mark planned session as completed if linked
      if (plannedSessionId) {
        await supabase
          .from('planned_sessions')
          .update({ 
            completed: true, 
            completed_session_id: session.id 
          })
          .eq('id', plannedSessionId);
      }

      // Upload photos if any
      if (photos.length > 0) {
        await uploadSessionPhotos(photos, session.id, user!.id);
      }

      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      clearDraft();
      const photoMsg = photos.length > 0 ? ` y ${photos.length} foto(s)` : '';
      toast.success('¡Sesión guardada!', {
        icon: <Check className="h-4 w-4 text-green-500" />,
        description: `Se han registrado ${climbs.length} escaladas${photoMsg} correctamente.`,
        duration: 4000,
      });
      navigate(`/sessions/${session.id}`);
    },
    onError: (error) => {
      toast.error('Error al guardar la sesión: ' + error.message);
    },
  });

  const handleTypeNext = () => {
    if (sessionType === 'training') {
      // Skip climb input for training sessions
      setStep('details');
    } else if (sessionType === 'running') {
      // Running has its own form
      setStep('running');
    } else {
      setStep('count');
    }
  };

  const handleCountNext = () => {
    initializeClimbs(climbCount);
    setStep('climbs');
  };

  const handleCancel = () => {
    clearDraft();
    navigate('/home');
  };

  return (
    <div className="max-w-xl mx-auto">
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay un borrador guardado</AlertDialogTitle>
            <AlertDialogDescription>
              Quieres restaurarlo? Las fotos no se pueden recuperar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardDraft}>Descartar</AlertDialogCancel>
            <AlertDialogAction onClick={restoreDraft}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Cancel Button */}
      <div className="flex justify-end mb-4">
        {timerStarted && (
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
              <AlertDialogTitle>Cerrar registro?</AlertDialogTitle>
              <AlertDialogDescription>
                Si sales ahora, el registro se cerrara. Quieres guardar los datos para mas adelante? Las fotos no se guardan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Seguir registrando</AlertDialogCancel>
              <AlertDialogAction onClick={handleSaveAndExit}>
                Guardar y salir
              </AlertDialogAction>
              <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
                Salir sin guardar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {step === 'planned' && (
        <PlannedSessionStep
          value={plannedSessionId}
          onChange={handlePlannedSessionChange}
          onNext={() => plannedSessionId ? handleTypeNext() : setStep('type')}
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
          onBack={() => sessionType === 'training' ? setStep('type') : setStep('climbs')}
        />
      )}

      {step === 'weight' && (
        <WeightStep
          value={bodyWeight}
          onChange={setBodyWeight}
          onSubmit={() => createSession.mutate()}
          onBack={() => setStep('details')}
          isSubmitting={createSession.isPending}
        />
      )}

      {step === 'running' && (
        <RunningSessionForm onBack={() => setStep('type')} />
      )}
    </div>
  );
}
