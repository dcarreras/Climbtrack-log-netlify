import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Play, Pause, RotateCcw, Timer, Clock, Plus, Minus, Volume2, VolumeX, Dumbbell, ListOrdered, Trash2, SkipForward } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

// Web Audio API para generar sonidos (funciona con bluetooth)
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
    } catch (e) {
      console.log('Audio not supported');
    }
  }, [getAudioContext]);

  const playTickSound = useCallback(() => {
    playBeep(600, 80, 0.3);
  }, [playBeep]);

  const playWarningSound = useCallback(() => {
    playBeep(900, 200, 0.5);
  }, [playBeep]);

  const playFinishSound = useCallback(() => {
    playBeep(1000, 300, 0.7);
    setTimeout(() => playBeep(1000, 300, 0.7), 350);
    setTimeout(() => playBeep(1200, 500, 0.8), 700);
  }, [playBeep]);

  const playStartSound = useCallback(() => {
    playBeep(800, 150, 0.6);
    setTimeout(() => playBeep(1000, 200, 0.7), 200);
  }, [playBeep]);

  return { playTickSound, playWarningSound, playFinishSound, playStartSound };
};

interface CircuitExercise {
  id: string;
  name: string;
  reps: number;
  restSeconds: number;
}

type CircuitPhase = 'idle' | 'preparation' | 'exercise' | 'rest' | 'finished';

export default function TimerStopwatch() {
  const { playTickSound, playWarningSound, playFinishSound, playStartSound } = useAudioBeep();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastSecondRef = useRef<number>(-1);

  // Stopwatch state
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);

  // Countdown state
  const [countdownTime, setCountdownTime] = useState(0);
  const [countdownRunning, setCountdownRunning] = useState(false);
  const [countdownInput, setCountdownInput] = useState({ minutes: 0, seconds: 10 });

  // Sets counter state
  const [currentSet, setCurrentSet] = useState(1);
  const [totalSets, setTotalSets] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);

  // Circuit state
  const [preparationTime, setPreparationTime] = useState(10);
  const [exercises, setExercises] = useState<CircuitExercise[]>([
    { id: '1', name: 'Ejercicio 1', reps: 10, restSeconds: 60 },
    { id: '2', name: 'Ejercicio 2', reps: 5, restSeconds: 30 },
  ]);
  const [circuitPhase, setCircuitPhase] = useState<CircuitPhase>('idle');
  const [circuitTimer, setCircuitTimer] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [circuitRunning, setCircuitRunning] = useState(false);

  // Stopwatch effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime((prev) => prev + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [stopwatchRunning]);

  // Countdown effect with sounds
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdownRunning && countdownTime > 0) {
      interval = setInterval(() => {
        setCountdownTime((prev) => {
          const newTime = prev - 10;
          const currentSecond = Math.ceil(newTime / 1000);
          
          if (soundEnabled && currentSecond !== lastSecondRef.current && currentSecond <= 10 && currentSecond > 0) {
            lastSecondRef.current = currentSecond;
            if (currentSecond <= 3) {
              playWarningSound();
            } else {
              playTickSound();
            }
          }
          
          if (newTime <= 0) {
            setCountdownRunning(false);
            lastSecondRef.current = -1;
            if (soundEnabled) {
              playFinishSound();
            }
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200, 100, 300]);
            }
            return 0;
          }
          return newTime;
        });
      }, 10);
    }
    return () => clearInterval(interval);
  }, [countdownRunning, countdownTime, soundEnabled, playTickSound, playWarningSound, playFinishSound]);

  // Circuit timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (circuitRunning && circuitTimer > 0) {
      interval = setInterval(() => {
        setCircuitTimer((prev) => {
          const newTime = prev - 1;
          const currentSecond = newTime;
          
          if (soundEnabled && currentSecond <= 5 && currentSecond > 0) {
            if (currentSecond <= 3) {
              playWarningSound();
            } else {
              playTickSound();
            }
          }
          
          if (newTime <= 0) {
            // Move to next phase
            handleCircuitPhaseComplete();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [circuitRunning, circuitTimer, soundEnabled]);

  const handleCircuitPhaseComplete = () => {
    if (circuitPhase === 'preparation') {
      // Start first exercise
      if (soundEnabled) playStartSound();
      setCircuitPhase('exercise');
      // No timer for exercise, user marks complete
    } else if (circuitPhase === 'exercise') {
      // Start rest period
      const currentExercise = exercises[currentExerciseIndex];
      if (currentExercise.restSeconds > 0) {
        setCircuitPhase('rest');
        setCircuitTimer(currentExercise.restSeconds);
        if (soundEnabled) playFinishSound();
      } else {
        moveToNextExercise();
      }
    } else if (circuitPhase === 'rest') {
      moveToNextExercise();
    }
  };

  const moveToNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCircuitPhase('exercise');
      if (soundEnabled) playStartSound();
    } else {
      // Circuit finished
      setCircuitPhase('finished');
      setCircuitRunning(false);
      if (soundEnabled) playFinishSound();
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 500]);
      }
    }
  };

  const startCircuit = () => {
    setCurrentExerciseIndex(0);
    setCircuitPhase('preparation');
    setCircuitTimer(preparationTime);
    setCircuitRunning(true);
    if (soundEnabled) playTickSound();
  };

  const completeExercise = () => {
    if (circuitPhase === 'exercise') {
      handleCircuitPhaseComplete();
    }
  };

  const skipRest = () => {
    if (circuitPhase === 'rest') {
      setCircuitTimer(0);
      moveToNextExercise();
    }
  };

  const resetCircuit = () => {
    setCircuitRunning(false);
    setCircuitPhase('idle');
    setCircuitTimer(0);
    setCurrentExerciseIndex(0);
  };

  const addExercise = () => {
    const newId = Date.now().toString();
    setExercises(prev => [...prev, { 
      id: newId, 
      name: `Ejercicio ${prev.length + 1}`, 
      reps: 10, 
      restSeconds: 60 
    }]);
  };

  const removeExercise = (id: string) => {
    if (exercises.length > 1) {
      setExercises(prev => prev.filter(e => e.id !== id));
    }
  };

  const updateExercise = (id: string, field: keyof CircuitExercise, value: string | number) => {
    setExercises(prev => prev.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const formatTime = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return {
      display: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      centiseconds: centiseconds.toString().padStart(2, '0'),
    };
  }, []);

  const formatSeconds = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startCountdown = () => {
    const totalMs = (countdownInput.minutes * 60 + countdownInput.seconds) * 1000;
    if (totalMs > 0) {
      lastSecondRef.current = -1;
      setCountdownTime(totalMs);
      setCountdownRunning(true);
    }
  };

  const quickStartCountdown = (seconds: number) => {
    lastSecondRef.current = -1;
    setCountdownTime(seconds * 1000);
    setCountdownRunning(true);
  };

  const nextSet = () => {
    if (currentSet < totalSets) {
      setCurrentSet(prev => prev + 1);
    } else if (currentRound < totalRounds) {
      setCurrentSet(1);
      setCurrentRound(prev => prev + 1);
    }
    if (soundEnabled) playTickSound();
  };

  const prevSet = () => {
    if (currentSet > 1) {
      setCurrentSet(prev => prev - 1);
    } else if (currentRound > 1) {
      setCurrentRound(prev => prev - 1);
      setCurrentSet(totalSets);
    }
  };

  const resetSets = () => {
    setCurrentSet(1);
    setCurrentRound(1);
  };

  const stopwatchFormatted = formatTime(stopwatchTime);
  const countdownFormatted = formatTime(countdownTime);
  const isLastSeconds = countdownTime <= 10000 && countdownTime > 0;

  const getPhaseLabel = () => {
    switch (circuitPhase) {
      case 'preparation': return '¡Prepárate!';
      case 'exercise': return exercises[currentExerciseIndex]?.name || 'Ejercicio';
      case 'rest': return 'Descanso';
      case 'finished': return '¡Completado!';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (circuitPhase) {
      case 'preparation': return 'text-yellow-500';
      case 'exercise': return 'text-primary';
      case 'rest': return 'text-blue-500';
      case 'finished': return 'text-green-500';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Sound toggle */}
      <div className="flex items-center justify-end gap-2">
        {soundEnabled ? <Volume2 className="h-4 w-4 text-muted-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
        <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
        <Label className="text-sm text-muted-foreground">Sonido</Label>
      </div>

      <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <Tabs defaultValue="circuit" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="circuit" className="flex items-center gap-1 text-xs px-1">
              <ListOrdered className="h-4 w-4" />
              <span className="hidden sm:inline">Circuito</span>
            </TabsTrigger>
            <TabsTrigger value="countdown" className="flex items-center gap-1 text-xs px-1">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Timer</span>
            </TabsTrigger>
            <TabsTrigger value="sets" className="flex items-center gap-1 text-xs px-1">
              <Dumbbell className="h-4 w-4" />
              <span className="hidden sm:inline">Sets</span>
            </TabsTrigger>
            <TabsTrigger value="stopwatch" className="flex items-center gap-1 text-xs px-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Crono</span>
            </TabsTrigger>
          </TabsList>

          {/* CIRCUIT TAB */}
          <TabsContent value="circuit" className="space-y-4">
            {circuitPhase === 'idle' ? (
              <>
                {/* Preparation time */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <Label className="text-sm">Preparación</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPreparationTime(prev => Math.max(5, prev - 5))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-12 text-center font-mono font-bold">{preparationTime}s</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPreparationTime(prev => prev + 5)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Exercise list */}
                <ScrollArea className="h-[280px] pr-2">
                  <div className="space-y-3">
                    {exercises.map((exercise, index) => (
                      <div key={exercise.id} className="p-3 bg-muted/20 rounded-lg border border-border/30 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-bold w-5">{index + 1}.</span>
                          <Input
                            value={exercise.name}
                            onChange={(e) => updateExercise(exercise.id, 'name', e.target.value)}
                            className="flex-1 h-8 text-sm"
                            placeholder="Nombre ejercicio"
                          />
                          {exercises.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeExercise(exercise.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-4 pl-7">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Reps:</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.reps}
                              onChange={(e) => updateExercise(exercise.id, 'reps', parseInt(e.target.value) || 1)}
                              className="w-14 h-7 text-sm text-center"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Descanso:</Label>
                            <Input
                              type="number"
                              min="0"
                              value={exercise.restSeconds}
                              onChange={(e) => updateExercise(exercise.id, 'restSeconds', parseInt(e.target.value) || 0)}
                              className="w-14 h-7 text-sm text-center"
                            />
                            <span className="text-xs text-muted-foreground">s</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button variant="outline" className="w-full" onClick={addExercise}>
                  <Plus className="mr-2 h-4 w-4" /> Añadir ejercicio
                </Button>

                <Button size="lg" className="w-full" onClick={startCircuit}>
                  <Play className="mr-2 h-5 w-5" /> Iniciar Circuito
                </Button>
              </>
            ) : (
              <>
                {/* Active circuit view */}
                <div className="text-center py-4">
                  <div className={`text-lg font-semibold mb-2 ${getPhaseColor()}`}>
                    {getPhaseLabel()}
                  </div>
                  
                  {circuitPhase === 'exercise' && (
                    <div className="space-y-4">
                      <div className="text-6xl font-bold text-primary">
                        {exercises[currentExerciseIndex]?.reps}
                        <span className="text-2xl text-muted-foreground ml-2">reps</span>
                      </div>
                      <Button size="lg" className="w-full" onClick={completeExercise}>
                        <SkipForward className="mr-2 h-5 w-5" /> Completado
                      </Button>
                    </div>
                  )}

                  {(circuitPhase === 'preparation' || circuitPhase === 'rest') && (
                    <div className="space-y-4">
                      <div className={`font-mono text-7xl font-bold ${circuitTimer <= 5 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                        {formatSeconds(circuitTimer)}
                      </div>
                      {circuitPhase === 'rest' && (
                        <>
                          <div className="text-sm text-muted-foreground">
                            Siguiente: {exercises[currentExerciseIndex + 1]?.name || 'Fin'}
                          </div>
                          <Button variant="outline" onClick={skipRest}>
                            <SkipForward className="mr-2 h-4 w-4" /> Saltar descanso
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {circuitPhase === 'finished' && (
                    <div className="space-y-4 py-6">
                      <div className="text-5xl">🎉</div>
                      <div className="text-xl font-bold text-green-500">¡Circuito completado!</div>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progreso</span>
                    <span>{currentExerciseIndex + (circuitPhase === 'finished' ? 1 : circuitPhase === 'rest' ? 1 : 0)} / {exercises.length}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${((currentExerciseIndex + (circuitPhase === 'finished' || circuitPhase === 'rest' ? 1 : 0)) / exercises.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setCircuitRunning(!circuitRunning)}
                  >
                    {circuitRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {circuitRunning ? 'Pausar' : 'Reanudar'}
                  </Button>
                  <Button variant="destructive" onClick={resetCircuit}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* COUNTDOWN TAB */}
          <TabsContent value="countdown" className="space-y-6">
            {countdownTime === 0 && !countdownRunning ? (
              <div className="space-y-4">
                <div className="flex justify-center gap-4 items-center">
                  <div className="text-center">
                    <label className="text-sm text-muted-foreground block mb-2">Min</label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={countdownInput.minutes}
                      onChange={(e) =>
                        setCountdownInput((prev) => ({
                          ...prev,
                          minutes: Math.max(0, Math.min(99, parseInt(e.target.value) || 0)),
                        }))
                      }
                      className="w-16 text-center text-2xl font-mono"
                    />
                  </div>
                  <span className="text-3xl font-bold text-muted-foreground mt-6">:</span>
                  <div className="text-center">
                    <label className="text-sm text-muted-foreground block mb-2">Seg</label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={countdownInput.seconds}
                      onChange={(e) =>
                        setCountdownInput((prev) => ({
                          ...prev,
                          seconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                        }))
                      }
                      className="w-16 text-center text-2xl font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {[10, 30, 60, 90, 120, 180].map((secs) => (
                    <Button
                      key={secs}
                      variant="secondary"
                      size="sm"
                      onClick={() => quickStartCountdown(secs)}
                    >
                      {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-center">
                  <Button size="lg" onClick={startCountdown} className="w-40">
                    <Play className="mr-2 h-5 w-5" /> Iniciar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div
                    className={`font-mono text-6xl font-bold tracking-tight transition-colors ${
                      isLastSeconds ? 'text-destructive animate-pulse' : 'text-foreground'
                    }`}
                  >
                    {countdownFormatted.display}
                    <span className="text-3xl text-muted-foreground">.{countdownFormatted.centiseconds}</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <Button
                    variant={countdownRunning ? "destructive" : "default"}
                    size="lg"
                    onClick={() => setCountdownRunning(!countdownRunning)}
                    className="w-32"
                  >
                    {countdownRunning ? (
                      <>
                        <Pause className="mr-2 h-5 w-5" /> Pausar
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" /> Reanudar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setCountdownRunning(false);
                      setCountdownTime(0);
                      lastSecondRef.current = -1;
                    }}
                    className="w-32"
                  >
                    <RotateCcw className="mr-2 h-5 w-5" /> Reset
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* SETS TAB */}
          <TabsContent value="sets" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-2">
                <Label className="text-muted-foreground">Series</Label>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setTotalSets(prev => Math.max(1, prev - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-8">{totalSets}</span>
                  <Button variant="outline" size="icon" onClick={() => setTotalSets(prev => prev + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-center space-y-2">
                <Label className="text-muted-foreground">Vueltas</Label>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setTotalRounds(prev => Math.max(1, prev - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-8">{totalRounds}</span>
                  <Button variant="outline" size="icon" onClick={() => setTotalRounds(prev => prev + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-center py-6 bg-muted/30 rounded-xl">
              <div className="text-muted-foreground text-sm mb-2">Vuelta {currentRound} de {totalRounds}</div>
              <div className="font-mono text-7xl font-bold text-primary">
                {currentSet}<span className="text-3xl text-muted-foreground">/{totalSets}</span>
              </div>
              <div className="text-muted-foreground text-lg mt-2">Serie actual</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progreso total</span>
                <span>{((currentRound - 1) * totalSets + currentSet)} / {totalSets * totalRounds}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(((currentRound - 1) * totalSets + currentSet) / (totalSets * totalRounds)) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="outline" size="lg" onClick={prevSet} disabled={currentSet === 1 && currentRound === 1}>
                <Minus className="mr-2 h-5 w-5" /> Anterior
              </Button>
              <Button 
                size="lg" 
                onClick={nextSet}
                disabled={currentSet === totalSets && currentRound === totalRounds}
              >
                <Plus className="mr-2 h-5 w-5" /> Siguiente
              </Button>
            </div>
            <div className="flex justify-center">
              <Button variant="ghost" onClick={resetSets}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar contador
              </Button>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm text-muted-foreground block text-center mb-3">Descanso rápido</Label>
              <div className="flex justify-center gap-2 flex-wrap">
                {[10, 30, 60, 90].map((secs) => (
                  <Button
                    key={secs}
                    variant="secondary"
                    size="sm"
                    onClick={() => quickStartCountdown(secs)}
                  >
                    {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* STOPWATCH TAB */}
          <TabsContent value="stopwatch" className="space-y-6">
            <div className="text-center">
              <div className="font-mono text-6xl font-bold text-foreground tracking-tight">
                {stopwatchFormatted.display}
                <span className="text-3xl text-muted-foreground">.{stopwatchFormatted.centiseconds}</span>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <Button
                variant={stopwatchRunning ? "destructive" : "default"}
                size="lg"
                onClick={() => setStopwatchRunning(!stopwatchRunning)}
                className="w-32"
              >
                {stopwatchRunning ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" /> Iniciar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setStopwatchRunning(false);
                  setStopwatchTime(0);
                }}
                className="w-32"
              >
                <RotateCcw className="mr-2 h-5 w-5" /> Reset
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
