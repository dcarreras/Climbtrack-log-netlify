import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type SessionType = Database['public']['Enums']['session_type'];

interface EditSessionDialogProps {
  session: {
    id: string;
    date: string;
    session_type: SessionType;
    gym_id: string | null;
    duration_min: number | null;
    rpe_1_10: number | null;
    body_weight_kg: number | null;
    mood: string | null;
    notes: string | null;
    description: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditSessionDialog({ session, open, onOpenChange }: EditSessionDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    date: session.date,
    session_type: session.session_type,
    gym_id: session.gym_id || '',
    duration_min: session.duration_min?.toString() || '90',
    rpe_1_10: session.rpe_1_10 || 6,
    body_weight_kg: session.body_weight_kg?.toString() || '',
    mood: session.mood || '',
    notes: session.notes || '',
    description: session.description || '',
  });

  const { data: gyms } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gyms').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const updateSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sessions')
        .update({
          date: formData.date,
          session_type: formData.session_type,
          gym_id: formData.gym_id || null,
          duration_min: formData.duration_min ? parseInt(formData.duration_min) : null,
          rpe_1_10: formData.rpe_1_10,
          body_weight_kg: formData.body_weight_kg ? parseFloat(formData.body_weight_kg) : null,
          mood: formData.mood || null,
          notes: formData.notes || null,
          description: formData.description || null,
        })
        .eq('id', session.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      toast.success('Sesión actualizada');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    },
  });

  const sessionTypes: { value: SessionType; label: string }[] = [
    { value: 'boulder', label: 'Boulder' },
    { value: 'rope', label: 'Cuerda' },
    { value: 'hybrid', label: 'Mixto' },
    { value: 'training', label: 'Entrenamiento' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Sesión</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción corta</Label>
            <Input
              id="description"
              placeholder="Ej: Proyectos rojos, técnica de talón..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/100 caracteres
            </p>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          {/* Session Type */}
          <div className="space-y-2">
            <Label>Tipo de sesión</Label>
            <Select
              value={formData.session_type}
              onValueChange={(v) => setFormData({ ...formData, session_type: v as SessionType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sessionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gym */}
          <div className="space-y-2">
            <Label>Gimnasio</Label>
            <Select
              value={formData.gym_id || 'none'}
              onValueChange={(v) => setFormData({ ...formData, gym_id: v === 'none' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un gimnasio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin gimnasio</SelectItem>
                {gyms?.map((gym) => (
                  <SelectItem key={gym.id} value={gym.id}>
                    {gym.name} {gym.city && `(${gym.city})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duración (minutos)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="480"
              value={formData.duration_min}
              onChange={(e) => setFormData({ ...formData, duration_min: e.target.value })}
            />
          </div>

          {/* RPE */}
          <div className="space-y-2">
            <Label>RPE (Esfuerzo percibido): {formData.rpe_1_10}</Label>
            <Slider
              value={[formData.rpe_1_10]}
              min={1}
              max={10}
              step={1}
              onValueChange={([v]) => setFormData({ ...formData, rpe_1_10: v })}
            />
          </div>

          {/* Body Weight */}
          <div className="space-y-2">
            <Label htmlFor="weight">Peso corporal (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="Opcional"
              value={formData.body_weight_kg}
              onChange={(e) => setFormData({ ...formData, body_weight_kg: e.target.value })}
            />
          </div>

          {/* Mood */}
          <div className="space-y-2">
            <Label htmlFor="mood">Estado de ánimo</Label>
            <Input
              id="mood"
              placeholder="😊 Cómo te sentiste"
              value={formData.mood}
              onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones adicionales..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={() => updateSession.mutate()}
              disabled={updateSession.isPending}
            >
              {updateSession.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
