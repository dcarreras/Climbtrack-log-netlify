import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Footprints, Calendar as CalendarIcon, Clock, Mountain, Flame, Save, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RunningSessionFormProps {
  onBack?: () => void;
}

export default function RunningSessionForm({ onBack }: RunningSessionFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [date, setDate] = useState<Date>(new Date());
  const [distanceKm, setDistanceKm] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [elevationGainM, setElevationGainM] = useState('');
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');

  // Calculate pace
  const pace = distanceKm && durationMin 
    ? (parseFloat(durationMin) / parseFloat(distanceKm)).toFixed(2)
    : null;

  const formatPace = (paceMinPerKm: string | null) => {
    if (!paceMinPerKm) return '-';
    const totalMin = parseFloat(paceMinPerKm);
    const min = Math.floor(totalMin);
    const sec = Math.round((totalMin - min) * 60);
    return `${min}:${sec.toString().padStart(2, '0')} /km`;
  };

  const createSession = useMutation({
    mutationFn: async () => {
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user!.id,
          date: format(date, 'yyyy-MM-dd'),
          session_type: 'running',
          duration_min: durationMin ? parseInt(durationMin) : null,
          distance_km: distanceKm ? parseFloat(distanceKm) : null,
          elevation_gain_m: elevationGainM ? parseFloat(elevationGainM) : null,
          rpe_1_10: rpe,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      toast.success('¡Sesión de running guardada!', {
        icon: <Check className="h-4 w-4 text-green-500" />,
        description: `${distanceKm} km en ${durationMin} min`,
        duration: 4000,
      });
      navigate(`/sessions/${session.id}`);
    },
    onError: (error) => {
      toast.error('Error al guardar: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distanceKm || !durationMin) {
      toast.error('Distancia y tiempo son obligatorios');
      return;
    }
    createSession.mutate();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Footprints className="h-6 w-6 text-cyan-500" />
            Nueva Sesión de Running
          </h2>
          <p className="text-muted-foreground">Registra tu entrenamiento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <Label className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4" />
              Fecha
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Distance & Duration */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Datos de la sesión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distance" className="flex items-center gap-2">
                  <Footprints className="h-4 w-4" />
                  Distancia (km)
                </Label>
                <Input
                  id="distance"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="10.5"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tiempo (min)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  placeholder="60"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="text-lg"
                />
              </div>
            </div>

            {/* Pace display */}
            {pace && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">Ritmo medio</div>
                <div className="text-2xl font-bold text-cyan-500">{formatPace(pace)}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="elevation" className="flex items-center gap-2">
                <Mountain className="h-4 w-4" />
                Desnivel positivo (m)
              </Label>
              <Input
                id="elevation"
                type="number"
                min="0"
                placeholder="250"
                value={elevationGainM}
                onChange={(e) => setElevationGainM(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* RPE */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" />
              Esfuerzo Percibido (RPE)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Muy fácil</span>
                <span>Máximo</span>
              </div>
              <Slider
                value={[rpe]}
                onValueChange={(v) => setRpe(v[0])}
                min={1}
                max={10}
                step={1}
                className="py-4"
              />
              <div className="text-center">
                <span className="text-3xl font-bold">{rpe}</span>
                <span className="text-muted-foreground"> / 10</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="¿Cómo te sentiste? ¿Algo a destacar?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full glow-primary"
          size="lg"
          disabled={createSession.isPending}
        >
          <Save className="mr-2 h-5 w-5" />
          {createSession.isPending ? 'Guardando...' : 'Guardar Sesión'}
        </Button>
      </form>
    </div>
  );
}
