import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { Loader2, Save, Minus, Plus, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import MediaUpload from '@/components/media/MediaUpload';

type ColorBand = Database['public']['Enums']['color_band'];

// Climb category tags
const climbCategoryTags = [
  { value: 'romos', label: 'Romos', icon: '🫳' },
  { value: 'regletas', label: 'Regletas', icon: '✋' },
  { value: 'desplome', label: 'Desplome', icon: '↗️' },
  { value: 'equilibrio', label: 'Equilibrio', icon: '⚖️' },
  { value: 'dinamico', label: 'Dinámico', icon: '💨' },
];

const boulderColorBands: { value: ColorBand; label: string; class: string }[] = [
  { value: 'white', label: 'Blanco', class: 'bg-white text-gray-900 border border-gray-300' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500 text-white' },
  { value: 'green', label: 'Verde', class: 'bg-green-500 text-white' },
  { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-400 text-gray-900' },
  { value: 'red', label: 'Rojo', class: 'bg-red-500 text-white' },
  { value: 'purple', label: 'Morado', class: 'bg-purple-600 text-white' },
  { value: 'black', label: 'Negro', class: 'bg-gray-900 text-white' },
];

const frenchRouteGrades = [
  '5a', '5a+', '5b', '5b+', '5c', '5c+',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+',
];

interface EditClimbDialogProps {
  climb: {
    id: string;
    discipline: 'boulder' | 'route';
    color_band: ColorBand | null;
    grade_value: string | null;
    sent: boolean;
    flash: boolean;
    attempts: number;
    tags: string[] | null;
    notes: string | null;
  };
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditClimbDialog({ climb, sessionId, open, onOpenChange }: EditClimbDialogProps) {
  const queryClient = useQueryClient();
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  
  const [formData, setFormData] = useState({
    color_band: climb.color_band,
    grade_value: climb.grade_value || '',
    sent: climb.sent,
    flash: climb.flash,
    attempts: climb.attempts,
    tags: climb.tags || [],
    notes: climb.notes?.replace(/^\[(Boulder|Autobelay|Cuerda)\]\s*/, '') || '',
  });

  const updateClimb = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('climbs')
        .update({
          color_band: climb.discipline === 'boulder' ? formData.color_band : null,
          grade_value: climb.discipline === 'route' ? formData.grade_value || null : null,
          sent: formData.sent,
          flash: formData.flash,
          attempts: formData.attempts,
          tags: formData.tags.length > 0 ? formData.tags : null,
          notes: formData.notes || null,
        })
        .eq('id', climb.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      toast.success('Escalada actualizada');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    },
  });

  const toggleTag = (tagValue: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagValue)
        ? prev.tags.filter(t => t !== tagValue)
        : [...prev.tags, tagValue]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Escalada</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Color Band for Boulder */}
          {climb.discipline === 'boulder' && (
            <div className="space-y-2">
              <Label>Color del bloque</Label>
              <div className="flex flex-wrap gap-2 justify-center">
                {boulderColorBands.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      'w-10 h-10 rounded-full transition-all',
                      color.class,
                      formData.color_band === color.value 
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' 
                        : ''
                    )}
                    onClick={() => setFormData({ ...formData, color_band: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Grade for Routes */}
          {climb.discipline === 'route' && (
            <div className="space-y-2">
              <Label>Grado (Escala Francesa)</Label>
              <Select 
                value={formData.grade_value || 'none'} 
                onValueChange={(v) => setFormData({ ...formData, grade_value: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el grado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin grado</SelectItem>
                  {frenchRouteGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Result */}
          <div className="space-y-3">
            <Label>Resultado</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sent: true, flash: formData.attempts === 1 })}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all text-center',
                  formData.sent
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-border hover:border-green-500/50'
                )}
              >
                <p className="font-semibold text-green-500">✓ Completado</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sent: false, flash: false })}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all text-center',
                  !formData.sent
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-border hover:border-orange-500/50'
                )}
              >
                <p className="font-semibold text-orange-500">🔄 En proyecto</p>
              </button>
            </div>
          </div>

          {/* Attempts */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label>Intentos</Label>
              {formData.sent && formData.attempts === 1 && (
                <p className="text-xs text-primary font-medium">¡Flash! ⚡</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const newAttempts = Math.max(1, formData.attempts - 1);
                  setFormData({ 
                    ...formData, 
                    attempts: newAttempts,
                    flash: formData.sent && newAttempts === 1
                  });
                }}
                disabled={formData.attempts <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xl font-bold w-8 text-center">{formData.attempts}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setFormData({ ...formData, attempts: formData.attempts + 1, flash: false })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category Tags */}
          <div className="space-y-2">
            <Label>Categorías</Label>
            <div className="flex flex-wrap gap-2">
              {climbCategoryTags.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border transition-all text-sm flex items-center gap-1',
                    formData.tags.includes(tag.value)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Beta, técnica, observaciones..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Foto de la escalada</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMediaUpload(!showMediaUpload)}
              >
                <Camera className="h-4 w-4 mr-1" />
                Añadir foto
              </Button>
            </div>
            {showMediaUpload && (
              <MediaUpload
                sessionId={sessionId}
                climbId={climb.id}
                onSuccess={() => {
                  setShowMediaUpload(false);
                  queryClient.invalidateQueries({ queryKey: ['session'] });
                }}
              />
            )}
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
              onClick={() => updateClimb.mutate()}
              disabled={updateClimb.isPending}
            >
              {updateClimb.isPending ? (
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
