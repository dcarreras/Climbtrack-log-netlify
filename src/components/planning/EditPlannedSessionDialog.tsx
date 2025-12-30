import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SessionType = 'boulder' | 'rope' | 'hybrid' | 'training' | 'running';

interface PlannedSession {
  id: string;
  date: string;
  session_type: SessionType;
  notes: string | null;
  trainer_notes: string | null;
  completed: boolean;
  gym_id: string | null;
  distance_km?: number | null;
  time_min?: number | null;
}

interface EditPlannedSessionDialogProps {
  session: PlannedSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sessionTypeLabels: Record<SessionType, string> = {
  boulder: 'Boulder',
  rope: 'Vías',
  hybrid: 'Híbrido',
  training: 'Entrenamiento',
  running: 'Running / Trail',
};

export default function EditPlannedSessionDialog({
  session,
  open,
  onOpenChange,
}: EditPlannedSessionDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    date: new Date(),
    session_type: 'boulder' as SessionType,
    notes: '',
    trainer_notes: '',
    distance_km: '',
    time_min: '',
  });

  useEffect(() => {
    if (session) {
      setFormData({
        date: new Date(session.date),
        session_type: session.session_type,
        notes: session.notes || '',
        trainer_notes: session.trainer_notes || '',
        distance_km: session.distance_km?.toString() || '',
        time_min: session.time_min?.toString() || '',
      });
    }
  }, [session]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      
      const { error } = await supabase
        .from('planned_sessions')
        .update({
          date: format(formData.date, 'yyyy-MM-dd'),
          session_type: formData.session_type,
          notes: formData.notes || null,
          trainer_notes: formData.trainer_notes || null,
          distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
          time_min: formData.time_min ? parseInt(formData.time_min) : null,
        })
        .eq('id', session.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sesión actualizada');
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar sesión planificada</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date, "d 'de' MMMM, yyyy", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData({ ...formData, date })}
                  locale={es}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
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
                {Object.entries(sessionTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Running specific fields */}
          {formData.session_type === 'running' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distancia (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="10.5"
                  value={formData.distance_km}
                  onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tiempo (min)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={formData.time_min}
                  onChange={(e) => setFormData({ ...formData, time_min: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Trainer Notes */}
          <div className="space-y-2">
            <Label>Notas de la entrenadora</Label>
            <Textarea
              value={formData.trainer_notes}
              onChange={(e) => setFormData({ ...formData, trainer_notes: e.target.value })}
              placeholder="Instrucciones del entrenamiento..."
              rows={3}
            />
          </div>

          {/* Personal Notes */}
          <div className="space-y-2">
            <Label>Mis notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas personales..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
