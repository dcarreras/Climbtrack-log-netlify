import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Camera } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { SessionTypeValue } from './SessionTypeStep';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import QuickPhotoCapture from '../QuickPhotoCapture';

type ColorBand = Database['public']['Enums']['color_band'];

// Send type for routes
type SendType = 'flash' | 'redpoint' | 'tried';

// Climb category tags
export const climbCategoryTags = [
  { value: 'romos', label: 'Romos', icon: '🫳' },
  { value: 'regletas', label: 'Regletas', icon: '✋' },
  { value: 'desplome', label: 'Desplome', icon: '↗️' },
  { value: 'equilibrio', label: 'Equilibrio', icon: '⚖️' },
  { value: 'dinamico', label: 'Dinámico', icon: '💨' },
];

export interface ClimbData {
  type: 'boulder' | 'autobelay' | 'rope';
  colorBand?: ColorBand | null;
  gradeValue?: string | null;
  sent: boolean;
  flash: boolean;
  attempts: number;
  sendType?: SendType;
  tags?: string[];
}

interface ClimbInputStepProps {
  sessionType: SessionTypeValue;
  totalClimbs: number;
  climbs: ClimbData[];
  onChange: (climbs: ClimbData[]) => void;
  onNext: () => void;
  onBack: () => void;
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
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

const sendTypeOptions: { value: SendType; label: string; description: string }[] = [
  { value: 'flash', label: 'Flash', description: 'Primer intento' },
  { value: 'redpoint', label: 'Red Point', description: 'Encadenada tras intentos' },
  { value: 'tried', label: 'Intentado', description: 'No completada' },
];

export default function ClimbInputStep({ 
  sessionType, 
  totalClimbs, 
  climbs, 
  onChange, 
  onNext, 
  onBack,
  photos,
  onPhotosChange
}: ClimbInputStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentClimb = climbs[currentIndex] || {
    type: sessionType === 'boulder' ? 'boulder' : sessionType === 'rope' ? 'autobelay' : 'boulder',
    colorBand: null,
    gradeValue: null,
    sent: true,
    flash: false,
    attempts: 1,
    sendType: 'flash' as SendType,
    tags: [] as string[],
  };

  const updateCurrentClimb = (updates: Partial<ClimbData>) => {
    const newClimbs = [...climbs];
    const updatedClimb = { ...currentClimb, ...updates };
    
    // Sync sendType with sent/flash for routes
    if (updates.sendType !== undefined) {
      if (updates.sendType === 'flash') {
        updatedClimb.sent = true;
        updatedClimb.flash = true;
        updatedClimb.attempts = 1;
      } else if (updates.sendType === 'redpoint') {
        updatedClimb.sent = true;
        updatedClimb.flash = false;
        if (updatedClimb.attempts < 2) updatedClimb.attempts = 2;
      } else if (updates.sendType === 'tried') {
        updatedClimb.sent = false;
        updatedClimb.flash = false;
      }
    }
    
    // For boulder, sync sent/flash based on attempts
    if (currentClimb.type === 'boulder' && updates.sent !== undefined) {
      if (updates.sent) {
        updatedClimb.flash = updatedClimb.attempts === 1;
      } else {
        updatedClimb.flash = false;
      }
    }
    
    newClimbs[currentIndex] = updatedClimb;
    onChange(newClimbs);
  };

  const handleNext = () => {
    if (currentIndex < totalClimbs - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onNext();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      onBack();
    }
  };

  const isValid = () => {
    if (currentClimb.type === 'boulder') {
      return currentClimb.colorBand !== null;
    }
    return currentClimb.gradeValue !== null && currentClimb.gradeValue !== '';
  };

  const progress = ((currentIndex + 1) / totalClimbs) * 100;
  const isRoute = currentClimb.type === 'autobelay' || currentClimb.type === 'rope';

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={handlePrev}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {currentIndex === 0 ? 'Volver' : 'Anterior'}
      </Button>

      <div className="text-center">
        <h2 className="text-2xl font-bold">Escalada {currentIndex + 1} de {totalClimbs}</h2>
        <Progress value={progress} className="mt-4" />
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Tipo de escalada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Climb Type Selection - only show for hybrid sessions */}
          {sessionType === 'hybrid' && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={currentClimb.type === 'boulder' ? 'default' : 'outline'}
                onClick={() => updateCurrentClimb({ type: 'boulder', colorBand: null, gradeValue: null })}
              >
                Boulder
              </Button>
              <Button
                type="button"
                variant={currentClimb.type === 'autobelay' ? 'default' : 'outline'}
                onClick={() => updateCurrentClimb({ type: 'autobelay', colorBand: null, gradeValue: null })}
              >
                Autobelay
              </Button>
              <Button
                type="button"
                variant={currentClimb.type === 'rope' ? 'default' : 'outline'}
                onClick={() => updateCurrentClimb({ type: 'rope', colorBand: null, gradeValue: null })}
              >
                Cuerda
              </Button>
            </div>
          )}

          {/* For rope-only sessions, allow autobelay vs rope */}
          {sessionType === 'rope' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={currentClimb.type === 'autobelay' ? 'default' : 'outline'}
                onClick={() => updateCurrentClimb({ type: 'autobelay' })}
              >
                Autobelay
              </Button>
              <Button
                type="button"
                variant={currentClimb.type === 'rope' ? 'default' : 'outline'}
                onClick={() => updateCurrentClimb({ type: 'rope' })}
              >
                Cuerda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Selection */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>
            {currentClimb.type === 'boulder' ? 'Color del bloque' : 'Grado (Escala Francesa)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentClimb.type === 'boulder' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 justify-center">
                {boulderColorBands.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-12 h-12 rounded-full transition-all ${color.class} ${
                      currentClimb.colorBand === color.value 
                        ? 'ring-4 ring-primary ring-offset-2 ring-offset-background scale-110' 
                        : 'hover:scale-105'
                    }`}
                    onClick={() => updateCurrentClimb({ colorBand: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Blanco (fácil) → Negro (difícil)
              </p>
            </div>
          ) : (
            <Select 
              value={currentClimb.gradeValue || "none"} 
              onValueChange={(v) => updateCurrentClimb({ gradeValue: v === "none" ? null : v })}
            >
              <SelectTrigger className="text-lg h-14">
                <SelectValue placeholder="Selecciona el grado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecciona el grado</SelectItem>
                {frenchRouteGrades.map((grade) => (
                  <SelectItem key={grade} value={grade} className="text-lg">
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Result - Different UI for Boulder vs Routes */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRoute ? (
            // Routes: Flash / Red Point / Tried
            <>
              <div className="grid grid-cols-3 gap-2">
                {sendTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateCurrentClimb({ sendType: option.value })}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all text-center',
                      currentClimb.sendType === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <p className="font-semibold text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
              
              {/* Show attempts for redpoint and tried */}
              {(currentClimb.sendType === 'redpoint' || currentClimb.sendType === 'tried') && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <Label className="text-base">Intentos</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => updateCurrentClimb({ 
                        attempts: Math.max(currentClimb.sendType === 'redpoint' ? 2 : 1, currentClimb.attempts - 1) 
                      })}
                      disabled={currentClimb.attempts <= (currentClimb.sendType === 'redpoint' ? 2 : 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-2xl font-bold w-12 text-center">{currentClimb.attempts}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => updateCurrentClimb({ attempts: currentClimb.attempts + 1 })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Boulder: Sent toggle + Attempts counter
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateCurrentClimb({ sent: true })}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-center',
                    currentClimb.sent
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-border hover:border-green-500/50'
                  )}
                >
                  <Check className="h-6 w-6 mx-auto mb-1 text-green-500" />
                  <p className="font-semibold">Completado</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateCurrentClimb({ sent: false })}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-center',
                    !currentClimb.sent
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-border hover:border-orange-500/50'
                  )}
                >
                  <span className="text-2xl mb-1 block">🔄</span>
                  <p className="font-semibold">Intentando</p>
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-base">Intentos</Label>
                  {currentClimb.sent && currentClimb.attempts === 1 && (
                    <p className="text-xs text-primary font-medium">¡Flash! ⚡</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => updateCurrentClimb({ attempts: Math.max(1, currentClimb.attempts - 1) })}
                    disabled={currentClimb.attempts <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-12 text-center">{currentClimb.attempts}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => updateCurrentClimb({ attempts: currentClimb.attempts + 1 })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Category Tags */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Categorías (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {climbCategoryTags.map((tag) => {
              const isSelected = currentClimb.tags?.includes(tag.value);
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => {
                    const currentTags = currentClimb.tags || [];
                    const newTags = isSelected
                      ? currentTags.filter((t) => t !== tag.value)
                      : [...currentTags, tag.value];
                    updateCurrentClimb({ tags: newTags });
                  }}
                  className={cn(
                    'px-3 py-2 rounded-lg border transition-all text-sm flex items-center gap-1.5',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Photo Capture */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Fotos de la escalada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuickPhotoCapture 
            photos={photos}
            onPhotosChange={onPhotosChange}
          />
        </CardContent>
      </Card>

      <Button 
        className="w-full glow-primary" 
        size="lg"
        onClick={handleNext}
        disabled={!isValid()}
      >
        {currentIndex < totalClimbs - 1 ? (
          <>
            Siguiente escalada
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Continuar con los detalles
          </>
        )}
      </Button>
    </div>
  );
}
