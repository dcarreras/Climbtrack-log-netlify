import { ArrowLeft, Check, Play, Mountain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BOULDER_COLOR_OPTIONS,
  getBoulderPlanTotal,
  summarizeBoulderPlan,
  type BoulderPlanItem,
} from '@/lib/boulderPlan';

interface BoulderPlanConfirmStepProps {
  onBack: () => void;
  onStart: () => void;
  plannedSessionLabel?: string | null;
  value: BoulderPlanItem[];
}

export default function BoulderPlanConfirmStep({
  onBack,
  onStart,
  plannedSessionLabel,
  value,
}: BoulderPlanConfirmStepProps) {
  const totalBlocks = getBoulderPlanTotal(value);
  const summary = summarizeBoulderPlan(value);

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Editar lista
      </Button>

      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold">Confirma tu sesión de bloque</h2>
        <p className="text-muted-foreground mt-2">
          En cuanto empieces se creará la sesión activa, arrancará el contador y podrás ir marcando cada bloque.
        </p>
      </div>

      <Card className="card-elevated">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Mountain className="h-5 w-5 text-primary" />
            Resumen de hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 pt-0 sm:p-4 sm:pt-0">
          {plannedSessionLabel && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Sesión planificada</span>
              <span className="font-medium">{plannedSessionLabel}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Total previsto</span>
            <Badge>{totalBlocks} bloques</Badge>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Lista confirmada</p>
            <p className="mt-2 text-lg font-semibold">{summary}</p>
          </div>

          <div className="space-y-2">
            {value.map((item) => {
              const color = BOULDER_COLOR_OPTIONS.find((option) => option.value === item.colorBand);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${color?.className || 'bg-muted'}`} />
                    <span className="font-medium">{color?.label || item.colorBand}</span>
                  </div>
                  <span className="text-muted-foreground">{item.count} bloque(s)</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full glow-primary" size="lg" onClick={onStart}>
        <Play className="mr-2 h-4 w-4" />
        Empezar sesión
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-primary" />
        La sesión quedará guardada en tiempo real y podrás retomarla si cierras la app.
      </div>
    </div>
  );
}
