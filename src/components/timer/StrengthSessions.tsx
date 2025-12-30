import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, RotateCcw, Plus, Minus, Check, Clock, Dumbbell, ChevronRight, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StrengthExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

interface PreplannedSession {
  id: string;
  name: string;
  description: string;
  exercises: StrengthExercise[];
}

const PREPLANNED_SESSIONS: PreplannedSession[] = [
  { id: '1', name: 'Fuerza General', description: 'Sesión completa de fuerza', exercises: [
    { id: '1a', name: 'Pull-ups', sets: 4, reps: 8, restSeconds: 90 },
    { id: '1b', name: 'Dips', sets: 4, reps: 10, restSeconds: 90 },
    { id: '1c', name: 'Rows', sets: 3, reps: 12, restSeconds: 60 },
    { id: '1d', name: 'Push-ups', sets: 3, reps: 15, restSeconds: 60 },
  ]},
  { id: '2', name: 'Core Intenso', description: 'Trabajo de core y estabilidad', exercises: [
    { id: '2a', name: 'Front Lever raises', sets: 4, reps: 5, restSeconds: 120 },
    { id: '2b', name: 'L-sit holds', sets: 4, reps: 10, restSeconds: 90 },
    { id: '2c', name: 'Hollow body rocks', sets: 3, reps: 20, restSeconds: 60 },
  ]},
  { id: '3', name: 'Potencia Explosiva', description: 'Movimientos explosivos', exercises: [
    { id: '3a', name: 'Campus touches', sets: 5, reps: 6, restSeconds: 180 },
    { id: '3b', name: 'Power pull-ups', sets: 4, reps: 5, restSeconds: 120 },
    { id: '3c', name: 'Muscle-ups', sets: 3, reps: 3, restSeconds: 180 },
  ]},
];

const useAudioBeep = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContextRef.current;
  }, []);
  const playBeep = useCallback((frequency: number = 800, duration: number = 150, volume: number = 0.5) => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (e) { console.log('Audio not supported'); }
  }, [getAudioContext]);

  return {
    playTickSound: useCallback(() => playBeep(600, 80, 0.3), [playBeep]),
    playWarningSound: useCallback(() => playBeep(900, 200, 0.5), [playBeep]),
    playFinishSound: useCallback(() => { playBeep(1000, 300, 0.7); setTimeout(() => playBeep(1000, 300, 0.7), 350); setTimeout(() => playBeep(1200, 500, 0.8), 700); }, [playBeep]),
  };
};

export default function StrengthSessions({ soundEnabled }: { soundEnabled: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playTickSound, playWarningSound, playFinishSound } = useAudioBeep();
  
  const [activeSession, setActiveSession] = useState<PreplannedSession | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [repCount, setRepCount] = useState(0);
  const [restTime, setRestTime] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [freeTime, setFreeTime] = useState(0);
  const [freeRunning, setFreeRunning] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);

  // Fetch strength history
  const { data: strengthHistory = [] } = useQuery({
    queryKey: ['strength-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_type', 'strength')
        .order('completed_at', { ascending: true })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Save training session
  const saveTrainingSession = useMutation({
    mutationFn: async (data: { sessionName: string; setsCompleted: number; durationSeconds: number }) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('training_sessions').insert({
        user_id: user.id,
        session_type: 'strength',
        protocol_name: data.sessionName,
        sets_completed: data.setsCompleted,
        total_sets: activeSession?.exercises.reduce((sum, e) => sum + e.sets, 0) || 0,
        duration_seconds: data.durationSeconds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strength-history'] });
      toast.success('Sesión guardada');
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restRunning && restTime > 0) {
      interval = setInterval(() => {
        setRestTime(prev => {
          const newTime = prev - 1;
          if (soundEnabled && newTime <= 5 && newTime > 0) {
            if (newTime <= 3) playWarningSound();
            else playTickSound();
          }
          if (newTime <= 0) {
            setRestRunning(false);
            if (soundEnabled) playFinishSound();
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restRunning, restTime, soundEnabled]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (freeRunning) {
      interval = setInterval(() => setFreeTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [freeRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = (session: PreplannedSession) => {
    setActiveSession(session);
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setRepCount(0);
    setRestTime(0);
    setRestRunning(false);
    setSessionStartTime(Date.now());
    setCompletedSets(0);
  };

  const completeSet = () => {
    if (!activeSession) return;
    const exercise = activeSession.exercises[currentExerciseIndex];
    setCompletedSets(prev => prev + 1);
    
    if (currentSet < exercise.sets) {
      setCurrentSet(prev => prev + 1);
      setRepCount(0);
      setRestTime(exercise.restSeconds);
      setRestRunning(true);
      if (soundEnabled) playTickSound();
    } else {
      if (currentExerciseIndex < activeSession.exercises.length - 1) {
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSet(1);
        setRepCount(0);
        setRestTime(activeSession.exercises[currentExerciseIndex + 1]?.restSeconds || 60);
        setRestRunning(true);
        if (soundEnabled) playFinishSound();
      } else {
        if (soundEnabled) playFinishSound();
        if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 500]);
        const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
        saveTrainingSession.mutate({ sessionName: activeSession.name, setsCompleted: completedSets + 1, durationSeconds: duration });
        setActiveSession(null);
      }
    }
  };

  const exitSession = () => {
    if (activeSession && completedSets > 0) {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      saveTrainingSession.mutate({ sessionName: activeSession.name, setsCompleted: completedSets, durationSeconds: duration });
    }
    setActiveSession(null);
    setRestRunning(false);
    setFreeRunning(false);
  };

  const chartData = strengthHistory.map(s => ({
    date: format(new Date(s.completed_at), 'dd/MM', { locale: es }),
    sets: s.sets_completed,
    duration: Math.floor((s.duration_seconds || 0) / 60),
  }));

  const currentExercise = activeSession?.exercises[currentExerciseIndex];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="preplanned" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="preplanned" className="text-xs"><Dumbbell className="h-4 w-4 mr-1" />Sesiones</TabsTrigger>
          <TabsTrigger value="free" className="text-xs"><Clock className="h-4 w-4 mr-1" />Libre</TabsTrigger>
          <TabsTrigger value="progress" className="text-xs"><TrendingUp className="h-4 w-4 mr-1" />Progreso</TabsTrigger>
        </TabsList>

        <TabsContent value="preplanned" className="space-y-4">
          {!activeSession ? (
            <ScrollArea className="h-[350px]">
              <div className="space-y-3 pr-2">
                {PREPLANNED_SESSIONS.map(session => (
                  <Card key={session.id} className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => startSession(session)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{session.name}</h3>
                        <p className="text-sm text-muted-foreground">{session.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{session.exercises.length} ejercicios</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{activeSession.name}</h3>
                  <p className="text-sm text-muted-foreground">Ejercicio {currentExerciseIndex + 1}/{activeSession.exercises.length}</p>
                </div>
                <Button variant="outline" size="sm" onClick={exitSession}>Salir</Button>
              </div>

              {restRunning ? (
                <div className="text-center py-6 space-y-4">
                  <div className="text-lg font-semibold text-blue-500">Descanso</div>
                  <div className="text-6xl font-bold font-mono">{formatTime(restTime)}</div>
                  <Button variant="outline" onClick={() => { setRestRunning(false); setRestTime(0); }}>Saltar</Button>
                </div>
              ) : (
                <Card className="p-6 text-center bg-primary/5 border-primary/20">
                  <h4 className="text-xl font-bold mb-2">{currentExercise?.name}</h4>
                  <div className="flex justify-center gap-6 text-sm text-muted-foreground mb-4">
                    <span>Set {currentSet}/{currentExercise?.sets}</span>
                    <span>{currentExercise?.reps} reps</span>
                  </div>

                  <div className="flex items-center justify-center gap-4 mb-6">
                    <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => setRepCount(Math.max(0, repCount - 1))}><Minus className="h-5 w-5" /></Button>
                    <div className="text-5xl font-bold w-24">{repCount}</div>
                    <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => { setRepCount(repCount + 1); if (soundEnabled) playTickSound(); }}><Plus className="h-5 w-5" /></Button>
                  </div>

                  <Button size="lg" className="w-full" onClick={completeSet}><Check className="mr-2 h-5 w-5" /> Set Completado</Button>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="free" className="space-y-6">
          <div className="text-center py-6">
            <div className="text-6xl font-bold font-mono mb-6">{formatTime(freeTime)}</div>
            <div className="flex justify-center gap-3">
              <Button variant={freeRunning ? "secondary" : "default"} size="lg" onClick={() => setFreeRunning(!freeRunning)}>
                {freeRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {freeRunning ? 'Pausar' : 'Iniciar'}
              </Button>
              <Button variant="outline" size="lg" onClick={() => { setFreeRunning(false); setFreeTime(0); }}><RotateCcw className="h-5 w-5" /></Button>
            </div>
          </div>

          <Card className="p-6">
            <Label className="text-sm text-muted-foreground text-center block mb-4">Contador de repeticiones</Label>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" className="h-14 w-14" onClick={() => setRepCount(Math.max(0, repCount - 1))}><Minus className="h-6 w-6" /></Button>
              <div className="text-6xl font-bold w-28 text-center">{repCount}</div>
              <Button variant="outline" size="icon" className="h-14 w-14" onClick={() => { setRepCount(repCount + 1); if (soundEnabled) playTickSound(); }}><Plus className="h-6 w-6" /></Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-4" onClick={() => setRepCount(0)}>Resetear</Button>
          </Card>

          <Card className="p-4">
            <Label className="text-sm text-muted-foreground text-center block mb-3">Descanso rápido</Label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map(secs => (
                <Button key={secs} variant="outline" size="sm" onClick={() => { setRestTime(secs); setRestRunning(true); }}>{secs}s</Button>
              ))}
            </div>
            {restTime > 0 && (
              <div className="mt-4 text-center">
                <div className="text-3xl font-bold font-mono">{formatTime(restTime)}</div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setRestRunning(false); setRestTime(0); }}>Cancelar</Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {strengthHistory.length === 0 ? (
            <Card className="p-6 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Completa sesiones para ver tu progreso</p>
            </Card>
          ) : (
            <>
              <Card className="p-4">
                <Label className="text-sm font-medium mb-3 block">Series completadas</Label>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="sets" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <Label className="text-sm font-medium mb-3 block">Duración (min)</Label>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="duration" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <Label className="text-sm font-medium mb-2 block">Últimas sesiones</Label>
                <ScrollArea className="h-[100px]">
                  <div className="space-y-2">
                    {strengthHistory.slice(-10).reverse().map(s => (
                      <div key={s.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                        <span className="text-muted-foreground">{format(new Date(s.completed_at), 'dd MMM', { locale: es })}</span>
                        <span>{s.protocol_name}</span>
                        <span className="text-muted-foreground">{s.sets_completed} sets</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
