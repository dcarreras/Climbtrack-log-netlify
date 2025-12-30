import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Pause, RotateCcw, ChevronRight, Timer, Plus, Trash2, Save, TrendingUp, Weight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HangboardProtocol {
  id: string;
  name: string;
  description: string;
  hangTime: number;
  restTime: number;
  sets: number;
  restBetweenSets: number;
  gripType: string;
  repsPerSet: number;
  isCustom?: boolean;
}

const DEFAULT_PROTOCOLS: HangboardProtocol[] = [
  { id: 'repeaters', name: 'Repeaters', description: 'Protocolo clásico de resistencia', hangTime: 7, restTime: 3, sets: 6, restBetweenSets: 180, gripType: 'Half Crimp', repsPerSet: 6 },
  { id: 'max-hangs', name: 'Max Hangs', description: 'Fuerza máxima con peso añadido', hangTime: 10, restTime: 0, sets: 5, restBetweenSets: 180, gripType: 'Half Crimp', repsPerSet: 1 },
  { id: 'density', name: 'Density Hangs', description: 'Volumen alto, intensidad moderada', hangTime: 20, restTime: 0, sets: 4, restBetweenSets: 120, gripType: 'Open Hand', repsPerSet: 1 },
  { id: 'one-arm', name: 'One Arm', description: 'Entrenamiento unilateral avanzado', hangTime: 5, restTime: 5, sets: 3, restBetweenSets: 180, gripType: 'Open Hand', repsPerSet: 3 },
  { id: 'emom', name: 'EMOM 10s', description: 'Every Minute On the Minute', hangTime: 10, restTime: 50, sets: 10, restBetweenSets: 0, gripType: 'Mixed', repsPerSet: 1 },
];

const GRIP_TYPES = ['Half Crimp', 'Open Hand', 'Full Crimp', 'Sloper', 'Pinch', '3 Finger Drag', '2 Finger Pocket'];

type SessionPhase = 'idle' | 'preparation' | 'hang' | 'rest' | 'set-rest' | 'finished';

const useAudioBeep = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
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
    playHangSound: useCallback(() => { playBeep(1000, 150, 0.7); setTimeout(() => playBeep(1200, 200, 0.8), 200); }, [playBeep]),
    playRestSound: useCallback(() => playBeep(500, 300, 0.5), [playBeep]),
    playFinishSound: useCallback(() => { playBeep(1000, 300, 0.7); setTimeout(() => playBeep(1000, 300, 0.7), 350); setTimeout(() => playBeep(1200, 500, 0.8), 700); }, [playBeep]),
  };
};

export default function HangboardSession({ soundEnabled }: { soundEnabled: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playTickSound, playWarningSound, playHangSound, playRestSound, playFinishSound } = useAudioBeep();
  
  const [selectedProtocol, setSelectedProtocol] = useState<HangboardProtocol | null>(null);
  const [customProtocol, setCustomProtocol] = useState<HangboardProtocol>({
    id: 'custom', name: 'Personalizado', description: '', hangTime: 7, restTime: 3, sets: 6, restBetweenSets: 180, gripType: 'Half Crimp', repsPerSet: 6,
  });
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [timer, setTimer] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [totalReps, setTotalReps] = useState(6);
  const [addedWeight, setAddedWeight] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newProtocolName, setNewProtocolName] = useState('');

  // Fetch custom protocols
  const { data: customProtocols = [] } = useQuery({
    queryKey: ['hangboard-protocols', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('hangboard_protocols')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        hangTime: p.hang_time,
        restTime: p.rest_time,
        sets: p.sets,
        restBetweenSets: p.rest_between_sets,
        gripType: p.grip_type,
        repsPerSet: p.reps_per_set,
        isCustom: true,
      })) as HangboardProtocol[];
    },
    enabled: !!user,
  });

  // Fetch training history for charts
  const { data: trainingHistory = [] } = useQuery({
    queryKey: ['hangboard-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_type', 'hangboard')
        .order('completed_at', { ascending: true })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Save protocol mutation
  const saveProtocol = useMutation({
    mutationFn: async (protocol: Omit<HangboardProtocol, 'id' | 'isCustom'>) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('hangboard_protocols').insert({
        user_id: user.id,
        name: protocol.name,
        description: protocol.description,
        hang_time: protocol.hangTime,
        rest_time: protocol.restTime,
        sets: protocol.sets,
        rest_between_sets: protocol.restBetweenSets,
        grip_type: protocol.gripType,
        reps_per_set: protocol.repsPerSet,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hangboard-protocols'] });
      toast.success('Protocolo guardado');
      setSaveDialogOpen(false);
      setNewProtocolName('');
    },
    onError: () => toast.error('Error al guardar protocolo'),
  });

  // Delete protocol mutation
  const deleteProtocol = useMutation({
    mutationFn: async (protocolId: string) => {
      const { error } = await supabase.from('hangboard_protocols').delete().eq('id', protocolId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hangboard-protocols'] });
      toast.success('Protocolo eliminado');
    },
  });

  // Save training session mutation
  const saveTrainingSession = useMutation({
    mutationFn: async (data: { protocol: HangboardProtocol; setsCompleted: number; durationSeconds: number }) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('training_sessions').insert({
        user_id: user.id,
        session_type: 'hangboard',
        protocol_name: data.protocol.name,
        grip_type: data.protocol.gripType,
        hang_time: data.protocol.hangTime,
        rest_time: data.protocol.restTime,
        sets_completed: data.setsCompleted,
        total_sets: data.protocol.sets,
        added_weight_kg: addedWeight > 0 ? addedWeight : null,
        duration_seconds: data.durationSeconds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hangboard-history'] });
      toast.success('Sesión guardada');
    },
  });

  const activeProtocol = selectedProtocol || customProtocol;
  const allProtocols = [...DEFAULT_PROTOCOLS, ...customProtocols];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          const newTime = prev - 1;
          if (soundEnabled) {
            if (newTime <= 3 && newTime > 0) playWarningSound();
            else if (newTime <= 5 && newTime > 3) playTickSound();
          }
          if (newTime <= 0) { handlePhaseComplete(); return 0; }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer, phase, soundEnabled]);

  const handlePhaseComplete = () => {
    if (phase === 'preparation') startHang();
    else if (phase === 'hang') {
      if (activeProtocol.restTime > 0 && currentRep < totalReps) {
        setPhase('rest'); setTimer(activeProtocol.restTime);
        if (soundEnabled) playRestSound();
      } else handleSetComplete();
    } else if (phase === 'rest') { setCurrentRep(prev => prev + 1); startHang(); }
    else if (phase === 'set-rest') { setCurrentSet(prev => prev + 1); setCurrentRep(1); startHang(); }
  };

  const handleSetComplete = () => {
    if (currentSet < activeProtocol.sets) {
      if (activeProtocol.restBetweenSets > 0) {
        setPhase('set-rest'); setTimer(activeProtocol.restBetweenSets);
        if (soundEnabled) playRestSound();
      } else { setCurrentSet(prev => prev + 1); setCurrentRep(1); startHang(); }
    } else {
      setPhase('finished'); setIsRunning(false);
      if (soundEnabled) playFinishSound();
      if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 500]);
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      saveTrainingSession.mutate({ protocol: activeProtocol, setsCompleted: currentSet, durationSeconds: duration });
    }
  };

  const startHang = () => {
    setPhase('hang'); setTimer(activeProtocol.hangTime);
    if (soundEnabled) playHangSound();
    if ('vibrate' in navigator) navigator.vibrate(100);
  };

  const startSession = (protocol?: HangboardProtocol) => {
    if (protocol) setSelectedProtocol(protocol);
    const p = protocol || customProtocol;
    setCurrentSet(1); setCurrentRep(1);
    setTotalReps(p.repsPerSet);
    setPhase('preparation'); setTimer(5); setIsRunning(true);
    setSessionStartTime(Date.now());
  };

  const resetSession = () => {
    setIsRunning(false); setPhase('idle'); setTimer(0); setCurrentSet(1); setCurrentRep(1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}`;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'preparation': return '¡Prepárate!';
      case 'hang': return '¡CUELGA!';
      case 'rest': return 'Descanso';
      case 'set-rest': return 'Descanso entre series';
      case 'finished': return '¡Completado!';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'preparation': return 'text-yellow-500 bg-yellow-500/10';
      case 'hang': return 'text-red-500 bg-red-500/10';
      case 'rest': return 'text-blue-500 bg-blue-500/10';
      case 'set-rest': return 'text-green-500 bg-green-500/10';
      case 'finished': return 'text-primary bg-primary/10';
      default: return '';
    }
  };

  const chartData = trainingHistory.map(s => ({
    date: format(new Date(s.completed_at), 'dd/MM', { locale: es }),
    weight: s.added_weight_kg || 0,
    hangTime: s.hang_time || 0,
    sets: s.sets_completed,
  }));

  // Active session view
  if (phase !== 'idle') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold">{activeProtocol.name}</h3>
            <p className="text-sm text-muted-foreground">{activeProtocol.gripType}</p>
          </div>
          <Button variant="outline" size="sm" onClick={resetSession}>Salir</Button>
        </div>

        <Card className={`p-8 text-center ${getPhaseColor()}`}>
          <div className="text-xl font-semibold mb-4">{getPhaseLabel()}</div>
          {phase !== 'finished' && (
            <>
              <div className="text-8xl font-bold font-mono mb-4">{timer}</div>
              <div className="text-sm text-muted-foreground">
                Set {currentSet}/{activeProtocol.sets}
                {totalReps > 1 && ` • Rep ${currentRep}/${totalReps}`}
              </div>
            </>
          )}
          {phase === 'finished' && (
            <div className="py-4">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-muted-foreground">{activeProtocol.sets} series completadas</p>
              {addedWeight > 0 && <p className="text-sm text-muted-foreground mt-1">+{addedWeight}kg</p>}
            </div>
          )}
        </Card>

        <div className="flex justify-center gap-3">
          {phase !== 'finished' && (
            <>
              <Button variant={isRunning ? "secondary" : "default"} size="lg" onClick={() => setIsRunning(!isRunning)}>
                {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {isRunning ? 'Pausar' : 'Continuar'}
              </Button>
              {(phase === 'rest' || phase === 'set-rest') && (
                <Button variant="outline" size="lg" onClick={() => { setTimer(0); handlePhaseComplete(); }}>Saltar</Button>
              )}
            </>
          )}
          {phase === 'finished' && <Button size="lg" onClick={resetSession}>Nueva sesión</Button>}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="protocols" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="protocols" className="text-xs">Protocolos</TabsTrigger>
        <TabsTrigger value="custom" className="text-xs">Personalizar</TabsTrigger>
        <TabsTrigger value="progress" className="text-xs">Progreso</TabsTrigger>
      </TabsList>

      <TabsContent value="protocols" className="space-y-4">
        {/* Added weight input */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Weight className="h-4 w-4" /> Peso añadido
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={addedWeight}
                onChange={e => setAddedWeight(parseFloat(e.target.value) || 0)}
                className="w-20 h-8 text-center"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
          </div>
        </Card>

        <ScrollArea className="h-[280px]">
          <div className="space-y-2 pr-2">
            {/* Custom protocols first */}
            {customProtocols.length > 0 && (
              <>
                <Label className="text-xs text-muted-foreground px-1">Mis protocolos</Label>
                {customProtocols.map(protocol => (
                  <Card key={protocol.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors border-primary/20">
                    <div className="flex items-center justify-between">
                      <div onClick={() => startSession(protocol)} className="flex-1">
                        <h4 className="font-medium">{protocol.name}</h4>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{protocol.hangTime}s hang</span>
                          <span>{protocol.sets} sets</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProtocol.mutate(protocol.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </>
            )}

            <Label className="text-xs text-muted-foreground px-1 mt-4 block">Predefinidos</Label>
            {DEFAULT_PROTOCOLS.map(protocol => (
              <Card key={protocol.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => startSession(protocol)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{protocol.name}</h4>
                    <p className="text-xs text-muted-foreground">{protocol.description}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{protocol.hangTime}s hang</span>
                      {protocol.restTime > 0 && <span>{protocol.restTime}s rest</span>}
                      <span>{protocol.sets} sets</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="custom" className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Crear protocolo</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Tiempo colgado (s)</Label>
              <Input type="number" min={1} value={customProtocol.hangTime} onChange={e => setCustomProtocol(prev => ({ ...prev, hangTime: parseInt(e.target.value) || 1 }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descanso rep (s)</Label>
              <Input type="number" min={0} value={customProtocol.restTime} onChange={e => setCustomProtocol(prev => ({ ...prev, restTime: parseInt(e.target.value) || 0 }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Series</Label>
              <Input type="number" min={1} value={customProtocol.sets} onChange={e => setCustomProtocol(prev => ({ ...prev, sets: parseInt(e.target.value) || 1 }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reps por serie</Label>
              <Input type="number" min={1} value={customProtocol.repsPerSet} onChange={e => setCustomProtocol(prev => ({ ...prev, repsPerSet: parseInt(e.target.value) || 1 }))} className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Descanso serie (s)</Label>
              <Input type="number" min={0} value={customProtocol.restBetweenSets} onChange={e => setCustomProtocol(prev => ({ ...prev, restBetweenSets: parseInt(e.target.value) || 0 }))} className="h-9" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Tipo de agarre</Label>
            <Select value={customProtocol.gripType} onValueChange={v => setCustomProtocol(prev => ({ ...prev, gripType: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{GRIP_TYPES.map(grip => <SelectItem key={grip} value={grip}>{grip}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => startSession()}>
              <Play className="mr-2 h-4 w-4" /> Iniciar
            </Button>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Save className="h-4 w-4" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Guardar protocolo</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Nombre del protocolo</Label>
                    <Input value={newProtocolName} onChange={e => setNewProtocolName(e.target.value)} placeholder="Mi protocolo" />
                  </div>
                  <Button className="w-full" disabled={!newProtocolName.trim()} onClick={() => saveProtocol.mutate({ ...customProtocol, name: newProtocolName })}>
                    Guardar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="progress" className="space-y-4">
        {trainingHistory.length === 0 ? (
          <Card className="p-6 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Completa sesiones para ver tu progreso</p>
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block">Peso añadido (kg)</Label>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block">Tiempo de colgado (s)</Label>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="hangTime" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <Label className="text-sm font-medium mb-2 block">Últimas sesiones</Label>
              <ScrollArea className="h-[120px]">
                <div className="space-y-2">
                  {trainingHistory.slice(-10).reverse().map(s => (
                    <div key={s.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                      <span className="text-muted-foreground">{format(new Date(s.completed_at), 'dd MMM', { locale: es })}</span>
                      <span>{s.protocol_name}</span>
                      <span className="text-muted-foreground">{s.added_weight_kg ? `+${s.added_weight_kg}kg` : '-'}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
