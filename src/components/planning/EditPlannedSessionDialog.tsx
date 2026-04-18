import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  encodePlannedSessionNotes,
  getPlannedSessionMeta,
  planningOptions,
  type PlannedFocus,
} from '@/lib/planning';

type SessionType = 'boulder' | 'rope' | 'hybrid' | 'training' | 'running' | 'bike';

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

const planningOrder: PlannedFocus[] = [
  'running',
  'bike',
  'strength',
  'campus',
  'rope',
  'boulder',
  'hybrid',
  'training',
];

export default function EditPlannedSessionDialog({
  session,
  open,
  onOpenChange,
}: EditPlannedSessionDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    date: new Date(),
    focus: 'running' as PlannedFocus,
    notes: '',
    trainer_notes: '',
    gym_id: '',
    distance_km: '',
    time_min: '',
  });

  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gyms').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (session) {
      const { focus, notes } = getPlannedSessionMeta(session.session_type, session.notes);
      setFormData({
        date: new Date(session.date),
        focus,
        notes,
        trainer_notes: session.trainer_notes || '',
        gym_id: session.gym_id || '',
        distance_km: session.distance_km?.toString() || '',
        time_min: session.time_min?.toString() || '',
      });
    }
  }, [session]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const selectedOption = planningOptions[formData.focus];
      
      const { error } = await supabase
        .from('planned_sessions')
        .update({
          date: format(formData.date, 'yyyy-MM-dd'),
          session_type: selectedOption.sessionType,
          notes: encodePlannedSessionNotes(formData.notes, formData.focus),
          trainer_notes: formData.trainer_notes || null,
          gym_id: selectedOption.showGym ? formData.gym_id || null : null,
          distance_km:
            selectedOption.showDistance && formData.distance_km
              ? parseFloat(formData.distance_km)
              : null,
          time_min:
            selectedOption.showTime && formData.time_min
              ? parseInt(formData.time_min)
              : null,
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
              value={formData.focus}
              onValueChange={(v) => setFormData({ ...formData, focus: v as PlannedFocus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {planningOrder.map((focus) => (
                  <SelectItem key={focus} value={focus}>
                    {planningOptions[focus].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {planningOptions[formData.focus].description}
            </p>
          </div>

          {planningOptions[formData.focus].showGym && (
            <div className="space-y-2">
              <Label>Rocódromo o lugar</Label>
              <Select
                value={formData.gym_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, gym_id: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin ubicación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin ubicación</SelectItem>
                  {gyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>
                      {gym.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {planningOptions[formData.focus].showTime && (
            <div className="space-y-2">
              <Label>
                {formData.focus === 'running' || formData.focus === 'bike'
                  ? 'Tiempo (min)'
                  : 'Duración estimada (min)'}
              </Label>
              <Input
                type="number"
                placeholder={formData.focus === 'running' || formData.focus === 'bike' ? '60' : '90'}
                value={formData.time_min}
                onChange={(e) => setFormData({ ...formData, time_min: e.target.value })}
              />
            </div>
          )}

          {/* Running specific fields */}
          {planningOptions[formData.focus].showDistance && (
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
            </div>
          )}

          {/* Trainer Notes */}
          <div className="space-y-2">
            <Label>Plan de la sesión</Label>
            <Textarea
              value={formData.trainer_notes}
              onChange={(e) => setFormData({ ...formData, trainer_notes: e.target.value })}
              placeholder="Objetivo, series, repeticiones, ritmo o descansos..."
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
