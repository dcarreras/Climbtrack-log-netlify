import { ArrowLeft, ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
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
  FRENCH_ROUTE_GRADES,
  type RoutePlanItem,
  createRoutePlanItem,
  getRoutePlanTotal,
  normalizeRoutePlan,
  summarizeRoutePlan,
} from '@/lib/routePlan';

interface RoutePlanStepProps {
  onBack: () => void;
  onChange: (plan: RoutePlanItem[]) => void;
  onNext: () => void;
  plannedHint?: string | null;
  value: RoutePlanItem[];
}

export default function RoutePlanStep({
  onBack,
  onChange,
  onNext,
  plannedHint,
  value,
}: RoutePlanStepProps) {
  const plan = value.length > 0 ? value : [createRoutePlanItem()];
  const totalRoutes = getRoutePlanTotal(plan);
  const summary = summarizeRoutePlan(plan);

  const updateItem = (itemId: string, patch: Partial<RoutePlanItem>) => {
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
    onChange(nextPlan.length > 0 ? nextPlan : [createRoutePlanItem()]);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold">¿Qué vías vas a escalar hoy?</h2>
        <p className="text-muted-foreground mt-2">
          Define la lista como cantidades por grado. Luego la app la expandirá para ir marcándola.
        </p>
      </div>

      {plannedHint && (
        <Card className="card-elevated border-primary/30">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Plan precargado desde planificación: <span className="font-medium text-foreground">{plannedHint}</span>
          </CardContent>
        </Card>
      )}

      <Card className="card-elevated">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg">Lista de grados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 pt-0 sm:p-4 sm:pt-0">
          {plan.map((item, index) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-end gap-2 rounded-lg border p-3">
              <div className="space-y-2">
                <Label>Grado #{index + 1}</Label>
                <Select
                  value={item.grade}
                  onValueChange={(grade) => updateItem(item.id, { grade: grade as RoutePlanItem['grade'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el grado" />
                  </SelectTrigger>
                  <SelectContent>
                    {FRENCH_ROUTE_GRADES.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
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

          <Button type="button" variant="outline" className="w-full" onClick={() => onChange([...plan, createRoutePlanItem()])}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir otro grado
          </Button>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="py-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Resumen</span>
            <Badge>{totalRoutes} vías</Badge>
          </div>
          <p className="mt-2 font-medium">{summary}</p>
        </CardContent>
      </Card>

      <Button
        className="w-full glow-primary"
        size="lg"
        onClick={() => {
          onChange(normalizeRoutePlan(plan));
          onNext();
        }}
        disabled={totalRoutes <= 0}
      >
        Confirmar lista
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
