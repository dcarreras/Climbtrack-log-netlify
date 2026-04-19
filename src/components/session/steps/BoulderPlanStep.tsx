import { AlertTriangle, ArrowLeft, ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BOULDER_COLOR_OPTIONS,
  createBoulderPlanItem,
  getBoulderPlanTotal,
  getBoulderColorLabel,
  normalizeBoulderPlan,
  summarizeBoulderPlan,
  type BoulderPlanItem,
} from '@/lib/boulderPlan';

interface BoulderPlanStepProps {
  onBack: () => void;
  onChange: (plan: BoulderPlanItem[]) => void;
  onNext: () => void;
  plannedHint?: string | null;
  plannedWarnings?: string[];
  value: BoulderPlanItem[];
}

export default function BoulderPlanStep({
  onBack,
  onChange,
  onNext,
  plannedHint,
  plannedWarnings = [],
  value,
}: BoulderPlanStepProps) {
  const plan = value.length > 0 ? value : [createBoulderPlanItem()];
  const totalBlocks = getBoulderPlanTotal(plan);
  const summary = summarizeBoulderPlan(plan);

  const updateItem = (itemId: string, patch: Partial<BoulderPlanItem>) => {
    onChange(
      plan.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const removeItem = (itemId: string) => {
    const nextPlan = plan.filter((item) => item.id !== itemId);
    onChange(nextPlan.length > 0 ? nextPlan : [createBoulderPlanItem()]);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold">¿Qué bloques vas a escalar hoy?</h2>
        <p className="text-muted-foreground mt-2">
          Define la lista como cantidades por color. Luego la app la expandirá para ir marcando cada bloque.
        </p>
      </div>

      {plannedHint && (
        <Card className="card-elevated border-primary/30">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Plan precargado desde planificación:{' '}
            <span className="font-medium text-foreground">{plannedHint}</span>
          </CardContent>
        </Card>
      )}

      {plannedWarnings.length > 0 && (
        <Card className="card-elevated border-amber-500/30">
          <CardContent className="flex gap-3 py-4 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <div>
              No se pudieron precargar estos colores del planner:{' '}
              <span className="font-medium text-foreground">{plannedWarnings.join(', ')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-elevated">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg">Lista de colores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 pt-0 sm:p-4 sm:pt-0">
          {plan.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_auto_auto] items-end gap-2 rounded-lg border p-3"
            >
              <div className="space-y-2">
                <Label>Color #{index + 1}</Label>
                <Select
                  value={item.colorBand}
                  onValueChange={(colorBand) =>
                    updateItem(item.id, { colorBand: colorBand as BoulderPlanItem['colorBand'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el color" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOULDER_COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cantidad</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => updateItem(item.id, { count: Math.max(1, item.count - 1) })}
                    disabled={item.count <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="min-w-10 justify-center py-2">
                    {item.count}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => updateItem(item.id, { count: item.count + 1 })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => removeItem(item.id)}
                disabled={plan.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onChange([...plan, createBoulderPlanItem()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir otro color
          </Button>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="py-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Resumen</span>
            <Badge>{totalBlocks} bloques</Badge>
          </div>
          <p className="mt-2 font-medium">{summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {normalizeBoulderPlan(plan).map((item) => (
              <Badge key={item.id} variant="outline">
                {item.count}x {getBoulderColorLabel(item.colorBand)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full glow-primary"
        size="lg"
        onClick={() => {
          onChange(normalizeBoulderPlan(plan));
          onNext();
        }}
        disabled={totalBlocks <= 0}
      >
        Confirmar lista
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
