import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Check } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Discipline = Database['public']['Enums']['discipline'];
type GradeSystem = Database['public']['Enums']['grade_system'];
type ClimbStyle = Database['public']['Enums']['climb_style'];
type HoldType = Database['public']['Enums']['hold_type'];
type ColorBand = Database['public']['Enums']['color_band'];

interface AddClimbFormProps {
  sessionId: string;
  onSuccess: () => void;
}

// Boulder color bands ordered from easy to hard
const boulderColorBands: { value: ColorBand; label: string; class: string }[] = [
  { value: 'white', label: 'Blanco', class: 'bg-white text-gray-900 border border-gray-300' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500 text-white' },
  { value: 'green', label: 'Verde', class: 'bg-green-500 text-white' },
  { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-400 text-gray-900' },
  { value: 'red', label: 'Rojo', class: 'bg-red-500 text-white' },
  { value: 'purple', label: 'Morado', class: 'bg-purple-600 text-white' },
  { value: 'black', label: 'Negro', class: 'bg-gray-900 text-white' },
];

// French grades for routes (5a to 7b+)
const frenchRouteGrades = [
  '5a', '5a+', '5b', '5b+', '5c', '5c+',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+',
];

const climbStyles: ClimbStyle[] = ['slab', 'vertical', 'overhang', 'roof'];
const holdTypes: HoldType[] = ['jugs', 'crimps', 'slopers', 'pinches', 'mixed'];

const suggestedTags = ['dyno', 'balance', 'power', 'endurance', 'fear', 'technique', 'heel hook', 'toe hook', 'mantle', 'crack'];

type ClimbDiscipline = 'boulder' | 'autobelay' | 'rope';

export default function AddClimbForm({ sessionId, onSuccess }: AddClimbFormProps) {
  const [climbType, setClimbType] = useState<ClimbDiscipline>('boulder');
  const [colorBand, setColorBand] = useState<ColorBand | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [style, setStyle] = useState<ClimbStyle | null>(null);
  const [holdType, setHoldType] = useState<HoldType | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [sent, setSent] = useState(false);
  const [flash, setFlash] = useState(false);
  const [fallCount, setFallCount] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createClimb = useMutation({
    mutationFn: async () => {
      // Map climbType to database discipline
      const discipline: Discipline = climbType === 'boulder' ? 'boulder' : 'route';
      
      const { error } = await supabase.from('climbs').insert({
        session_id: sessionId,
        discipline,
        color_band: climbType === 'boulder' ? colorBand : null,
        grade_system: (climbType === 'autobelay' || climbType === 'rope') ? 'french' : null,
        grade_value: (climbType === 'autobelay' || climbType === 'rope') ? gradeValue || null : null,
        style,
        hold_type: holdType,
        attempts,
        sent,
        flash,
        fall_count: fallCount,
        tags: tags.length > 0 ? tags : null,
        notes: notes ? `[${climbType === 'autobelay' ? 'Autobelay' : climbType === 'rope' ? 'Cuerda' : 'Boulder'}] ${notes}` : `[${climbType === 'autobelay' ? 'Autobelay' : climbType === 'rope' ? 'Cuerda' : 'Boulder'}]`,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('¡Escalada guardada!', {
        icon: <Check className="h-4 w-4 text-green-500" />,
        description: 'La escalada se ha añadido a tu sesión.',
      });
      // Reset form
      setColorBand(null);
      setGradeValue('');
      setStyle(null);
      setHoldType(null);
      setAttempts(1);
      setSent(false);
      setFlash(false);
      setFallCount(null);
      setTags([]);
      setNotes('');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Error al guardar: ' + error.message);
    },
  });

  const handleFlashChange = (checked: boolean) => {
    setFlash(checked);
    if (checked) {
      setSent(true);
      setAttempts(1);
    }
  };

  const handleSentChange = (checked: boolean) => {
    setSent(checked);
    if (!checked) {
      setFlash(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); createClimb.mutate(); }} className="space-y-6">
      {/* Discipline Type */}
      <div className="space-y-2">
        <Label>Tipo de escalada</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={climbType === 'boulder' ? 'default' : 'outline'}
            onClick={() => setClimbType('boulder')}
          >
            Boulder
          </Button>
          <Button
            type="button"
            variant={climbType === 'autobelay' ? 'default' : 'outline'}
            onClick={() => setClimbType('autobelay')}
          >
            Autobelay
          </Button>
          <Button
            type="button"
            variant={climbType === 'rope' ? 'default' : 'outline'}
            onClick={() => setClimbType('rope')}
          >
            Cuerda
          </Button>
        </div>
      </div>

      {/* Boulder Color Band - only for boulder */}
      {climbType === 'boulder' && (
        <div className="space-y-2">
          <Label>Color del bloque (fácil → difícil)</Label>
          <div className="flex flex-wrap gap-2">
            {boulderColorBands.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`w-10 h-10 rounded-full transition-all ${color.class} ${
                  colorBand === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''
                }`}
                onClick={() => setColorBand(colorBand === color.value ? null : color.value)}
                title={color.label}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Blanco → Azul → Verde → Amarillo → Rojo → Morado → Negro
          </p>
        </div>
      )}

      {/* French Grade - for autobelay and rope */}
      {(climbType === 'autobelay' || climbType === 'rope') && (
        <div className="space-y-2">
          <Label>Grado (Escala Francesa)</Label>
          <Select value={gradeValue || "none"} onValueChange={(v) => setGradeValue(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el grado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin grado</SelectItem>
              {frenchRouteGrades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Desde 5a (más fácil) hasta 7b+ (más difícil)
          </p>
        </div>
      )}

      {/* Quick Result */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="sent" className="cursor-pointer">Completado</Label>
          <Switch id="sent" checked={sent} onCheckedChange={handleSentChange} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="flash" className="cursor-pointer">Flash (primer intento)</Label>
          <Switch id="flash" checked={flash} onCheckedChange={handleFlashChange} />
        </div>
        <div className="space-y-2">
          <Label>Intentos</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setAttempts(Math.max(1, attempts - 1))}
              disabled={flash}
            >
              -
            </Button>
            <span className="w-12 text-center text-xl font-bold">{attempts}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setAttempts(attempts + 1)}
              disabled={flash}
            >
              +
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Toggle */}
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? 'Ocultar' : 'Mostrar'} opciones avanzadas
      </Button>

      {showAdvanced && (
        <>
          {/* Style & Holds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estilo</Label>
              <Select value={style || "none"} onValueChange={(v) => setStyle(v === "none" ? null : v as ClimbStyle)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {climbStyles.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s === 'slab' ? 'Placa' : s === 'vertical' ? 'Vertical' : s === 'overhang' ? 'Desplome' : 'Techo'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de presas</Label>
              <Select value={holdType || "none"} onValueChange={(v) => setHoldType(v === "none" ? null : v as HoldType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {holdTypes.map((h) => (
                    <SelectItem key={h} value={h} className="capitalize">
                      {h === 'jugs' ? 'Cazos' : h === 'crimps' ? 'Regletas' : h === 'slopers' ? 'Romos' : h === 'pinches' ? 'Pinzas' : 'Mixto'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Falls (for routes) */}
          {(climbType === 'autobelay' || climbType === 'rope') && (
            <div className="space-y-2">
              <Label>Caídas</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={fallCount ?? ''}
                onChange={(e) => setFallCount(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Beta, notas de técnica, estado mental..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </>
      )}

      <Button type="submit" className="w-full glow-primary" disabled={createClimb.isPending}>
        <Save className="mr-2 h-4 w-4" />
        {createClimb.isPending ? 'Guardando...' : 'Guardar Escalada'}
      </Button>
    </form>
  );
}
