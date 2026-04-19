import { Activity, ArrowLeft, Bike, ExternalLink, Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StravaOnlyStepProps {
  activityType: 'running' | 'bike';
  onBack: () => void;
  onOpenProfile: () => void;
  plannedSessionLabel?: string | null;
}

const config = {
  running: {
    icon: Footprints,
    label: 'Running',
    sentence:
      'Las sesiones de running ya no se registran manualmente. Se crean desde Strava y siguen contando en la carga de entrenamiento.',
  },
  bike: {
    icon: Bike,
    label: 'Bici',
    sentence:
      'Las sesiones de bici ya no se registran manualmente. Se crean desde Strava y siguen contando en la carga de entrenamiento.',
  },
} as const;

export default function StravaOnlyStep({
  activityType,
  onBack,
  onOpenProfile,
  plannedSessionLabel,
}: StravaOnlyStepProps) {
  const stepConfig = config[activityType];
  const Icon = stepConfig.icon;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <Card className="card-elevated border-primary/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Activity className="h-5 w-5 text-primary" />
            Registro vía Strava
          </CardTitle>
          <CardDescription>
            Simplificamos el flujo: {stepConfig.label} entra solo desde sincronización externa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-sm leading-6">{stepConfig.sentence}</p>
              {plannedSessionLabel && (
                <p className="text-sm text-muted-foreground">
                  Si sincronizas una actividad de {stepConfig.label.toLowerCase()} del mismo dia,
                  la sesion planificada se marcara como completada automaticamente.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Flujo recomendado: conecta Strava en tu perfil, pulsa `Sincronizar ahora` y la
            actividad aparecera en sesiones, analytics y carga de entrenamiento.
          </div>

          <Button className="w-full glow-primary" size="lg" onClick={onOpenProfile}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Ir a Perfil y sincronizar Strava
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
