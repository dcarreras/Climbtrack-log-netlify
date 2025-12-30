import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, Brain, MapPin, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface SessionDetailsData {
  date: string;
  gymId: string | null;
  durationMin: number;
  rpe: number;
  mood: string;
  notes: string;
}

interface SessionDetailsStepProps {
  value: SessionDetailsData;
  onChange: (value: SessionDetailsData) => void;
  onNext: () => void;
  onBack: () => void;
}

const moods = ['😤 Frustrado', '😐 Normal', '😊 Bien', '🔥 Motivado', '💪 Fuerte'];

export default function SessionDetailsStep({ value, onChange, onNext, onBack }: SessionDetailsStepProps) {
  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gyms').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const update = (updates: Partial<SessionDetailsData>) => {
    onChange({ ...value, ...updates });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <div className="text-center">
        <h2 className="text-2xl font-bold">Detalles de la sesión</h2>
        <p className="text-muted-foreground mt-2">Información general sobre tu sesión</p>
      </div>

      {/* Date & Gym */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Cuándo y Dónde
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={value.date}
                onChange={(e) => update({ date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Gimnasio (opcional)</Label>
              <Select 
                value={value.gymId || "none"} 
                onValueChange={(v) => update({ gymId: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un gimnasio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin gimnasio</SelectItem>
                  {gyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>
                      {gym.name} {gym.city && `- ${gym.city}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duration */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Duración: {value.durationMin} min
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Slider
            value={[value.durationMin]}
            onValueChange={(v) => update({ durationMin: v[0] })}
            min={15}
            max={240}
            step={15}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>15 min</span>
            <span>4 horas</span>
          </div>
        </CardContent>
      </Card>

      {/* RPE & Mood */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Esfuerzo y Sensaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>RPE (Esfuerzo Percibido): {value.rpe}/10</Label>
            <Slider
              value={[value.rpe]}
              onValueChange={(v) => update({ rpe: v[0] })}
              min={1}
              max={10}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Fácil</span>
              <span>Máximo</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estado de ánimo (opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {moods.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={value.mood === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ mood: value.mood === m ? '' : m })}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="¿Cómo fue la sesión? ¿Algún avance técnico o mental?"
              value={value.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Button 
        className="w-full glow-primary" 
        size="lg"
        onClick={onNext}
      >
        Continuar
      </Button>
    </div>
  );
}
