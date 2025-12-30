import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
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
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user!.id,
          date: sessionDetails.date,
          gym_id: sessionDetails.gymId,
          session_type: dbSessionType,
          duration_min: sessionDetails.durationMin,
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
    navigate('/home');
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Cancel Button */}
      <div className="flex justify-end mb-4">
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar registro?</AlertDialogTitle>
              <AlertDialogDescription>
                Se perderán todos los datos ingresados. ¿Estás seguro?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continuar registro</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
                Sí, cancelar
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
