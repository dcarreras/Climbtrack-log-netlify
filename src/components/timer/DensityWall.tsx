import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, RotateCcw, Plus, Minus, Timer, BookOpen, Hand, LayoutGrid } from 'lucide-react';

interface DensityExercise {
  id: string;
  name: string;
  description: string;
  category: 'traverso' | 'tecnica' | 'resistencia' | 'coordinacion';
  difficulty: 'easy' | 'medium' | 'hard';
}

const DENSITY_EXERCISES: DensityExercise[] = [
  // Traversos
  { id: '1', name: 'Traverso básico', description: 'Recorrido lateral sin límite de presas', category: 'traverso', difficulty: 'easy' },
  { id: '2', name: 'Traverso pies seguidos', description: 'Los pies solo pueden usar presas usadas por las manos', category: 'traverso', difficulty: 'medium' },
  { id: '3', name: 'Traverso eliminación', description: 'Tras cada vuelta elimina una presa', category: 'traverso', difficulty: 'hard' },
  { id: '4', name: 'Traverso ida y vuelta', description: 'Ir y volver sin tocar el suelo', category: 'traverso', difficulty: 'medium' },
  
  // Técnica
  { id: '5', name: 'Silent feet', description: 'Pies silenciosos, máxima precisión', category: 'tecnica', difficulty: 'easy' },
  { id: '6', name: 'Slow motion', description: 'Movimientos lentos y controlados', category: 'tecnica', difficulty: 'medium' },
  { id: '7', name: 'Stick drill', description: 'Cada movimiento de mano congela 3 segundos', category: 'tecnica', difficulty: 'medium' },
  { id: '8', name: 'Hover hands', description: 'La mano flota sobre la presa antes de agarrar', category: 'tecnica', difficulty: 'hard' },
  
  // Resistencia
  { id: '9', name: '4x4', description: '4 problemas × 4 veces con descanso mínimo', category: 'resistencia', difficulty: 'hard' },
  { id: '10', name: 'Pirámide de tiempo', description: '1-2-3-4-3-2-1 minutos con descanso igual', category: 'resistencia', difficulty: 'hard' },
  { id: '11', name: 'Pump clock', description: 'Escalar continuamente hasta fallo muscular', category: 'resistencia', difficulty: 'medium' },
  { id: '12', name: 'Intervals', description: '30s escalando / 30s descanso × 10', category: 'resistencia', difficulty: 'medium' },
  
  // Coordinación
  { id: '13', name: 'Ojos cerrados', description: 'Memoriza movimientos y repite sin ver', category: 'coordinacion', difficulty: 'hard' },
  { id: '14', name: 'Mano dominante', description: 'Solo inicia movimientos con mano no dominante', category: 'coordinacion', difficulty: 'medium' },
  { id: '15', name: 'Footwork focus', description: 'Cada pie se coloca en 1 movimiento preciso', category: 'coordinacion', difficulty: 'easy' },
  { id: '16', name: 'Cross moves', description: 'Solo movimientos cruzados de manos', category: 'coordinacion', difficulty: 'hard' },
];

const CATEGORY_LABELS: Record<string, string> = {
  traverso: 'Traversos',
  tecnica: 'Técnica',
  resistencia: 'Resistencia',
  coordinacion: 'Coordinación',
};

const CATEGORY_COLORS: Record<string, string> = {
  traverso: 'bg-blue-500/10 text-blue-500',
  tecnica: 'bg-green-500/10 text-green-500',
  resistencia: 'bg-red-500/10 text-red-500',
  coordinacion: 'bg-purple-500/10 text-purple-500',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
};

// Audio hook
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

  const playTickSound = useCallback(() => playBeep(600, 80, 0.3), [playBeep]);
  const playFinishSound = useCallback(() => {
    playBeep(1000, 300, 0.7);
    setTimeout(() => playBeep(1000, 300, 0.7), 350);
    setTimeout(() => playBeep(1200, 500, 0.8), 700);
  }, [playBeep]);

  return { playTickSound, playFinishSound };
};

export default function DensityWall({ soundEnabled }: { soundEnabled: boolean }) {
  const { playTickSound, playFinishSound } = useAudioBeep();
  
  // Timer state
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  // Movement counter
  const [moveCount, setMoveCount] = useState(0);
  
  // Selected exercise
  const [selectedExercise, setSelectedExercise] = useState<DensityExercise | null>(null);
  
  // Category filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetAll = () => {
    setIsRunning(false);
    setTime(0);
    setMoveCount(0);
  };

  const addMove = () => {
    setMoveCount(prev => prev + 1);
    if (soundEnabled) playTickSound();
  };

  const filteredExercises = categoryFilter === 'all' 
    ? DENSITY_EXERCISES 
    : DENSITY_EXERCISES.filter(e => e.category === categoryFilter);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="session" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="session" className="text-sm">
            <Timer className="h-4 w-4 mr-2" />
            Sesión
          </TabsTrigger>
          <TabsTrigger value="library" className="text-sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Biblioteca
          </TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="space-y-4">
          {/* Active exercise */}
          {selectedExercise && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex justify-between items-start">
                <div>
                  <div className={`inline-block px-2 py-0.5 rounded text-xs mb-2 ${CATEGORY_COLORS[selectedExercise.category]}`}>
                    {CATEGORY_LABELS[selectedExercise.category]}
                  </div>
                  <h3 className="font-bold">{selectedExercise.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedExercise.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedExercise(null)}>
                  ✕
                </Button>
              </div>
            </Card>
          )}

          {/* Timer */}
          <Card className="p-6 text-center">
            <Label className="text-sm text-muted-foreground block mb-2">Tiempo</Label>
            <div className="text-6xl font-bold font-mono mb-4">{formatTime(time)}</div>
            <div className="flex justify-center gap-3">
              <Button
                variant={isRunning ? "secondary" : "default"}
                size="lg"
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {isRunning ? 'Pausar' : 'Iniciar'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={resetAll}
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </Card>

          {/* Movement counter */}
          <Card className="p-6">
            <Label className="text-sm text-muted-foreground text-center block mb-4">
              Contador de movimientos
            </Label>
            <div className="flex items-center justify-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-14 w-14"
                onClick={() => setMoveCount(Math.max(0, moveCount - 1))}
              >
                <Minus className="h-6 w-6" />
              </Button>
              <div className="text-6xl font-bold w-28 text-center">{moveCount}</div>
              <Button 
                variant="default" 
                size="icon" 
                className="h-14 w-14"
                onClick={addMove}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            <div className="text-center text-sm text-muted-foreground mt-4">
              {time > 0 && moveCount > 0 && (
                <span>Ritmo: {(moveCount / (time / 60)).toFixed(1)} mov/min</span>
              )}
            </div>
          </Card>

          {/* Quick exercise select */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Ejercicio rápido</Label>
            <div className="grid grid-cols-2 gap-2">
              {DENSITY_EXERCISES.slice(0, 4).map(ex => (
                <Button
                  key={ex.id}
                  variant={selectedExercise?.id === ex.id ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-left h-auto py-2"
                  onClick={() => setSelectedExercise(ex)}
                >
                  <span className="truncate">{ex.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('all')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Todos
            </Button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Button
                key={key}
                variant={categoryFilter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Exercise list */}
          <ScrollArea className="h-[350px]">
            <div className="space-y-2 pr-2">
              {filteredExercises.map(exercise => (
                <Card 
                  key={exercise.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedExercise?.id === exercise.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedExercise(exercise)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_COLORS[exercise.category]}`}>
                          {CATEGORY_LABELS[exercise.category]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {DIFFICULTY_LABELS[exercise.difficulty]}
                        </span>
                      </div>
                      <h4 className="font-medium">{exercise.name}</h4>
                      <p className="text-sm text-muted-foreground">{exercise.description}</p>
                    </div>
                    {selectedExercise?.id === exercise.id && (
                      <div className="text-primary">✓</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {selectedExercise && (
            <Button 
              className="w-full" 
              onClick={() => {
                resetAll();
                setIsRunning(true);
              }}
            >
              <Play className="mr-2 h-4 w-4" /> Iniciar con {selectedExercise.name}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
