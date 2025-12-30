import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, AlertTriangle, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { getCurrentWeekClimbMetrics, getCurrentWeekRunningMetrics, SessionData, Modality } from '@/utils/metricsUtils';

interface TrainingAssistantProps {
  sessions: SessionData[];
  weeklyKmGoal: number;
  activeTab: 'climb' | 'running';
  modality?: Modality;
}

export default function TrainingAssistant({ 
  sessions, 
  weeklyKmGoal, 
  activeTab, 
  modality = 'boulder' 
}: TrainingAssistantProps) {
  const climbMetrics = useMemo(() => 
    getCurrentWeekClimbMetrics(sessions, modality),
    [sessions, modality]
  );

  const runningMetrics = useMemo(() => 
    getCurrentWeekRunningMetrics(sessions, weeklyKmGoal),
    [sessions, weeklyKmGoal]
  );

  const generateClimbInsights = () => {
    if (!climbMetrics) return [];
    
    const insights: { icon: React.ReactNode; text: string; type: 'info' | 'warning' | 'success' }[] = [];
    
    // Summary
    const modalityLabel = modality === 'boulder' ? 'Boulder' : modality === 'autobelay' ? 'Autobelay' : 'Cuerda';
    insights.push({
      icon: <TrendingUp className="h-4 w-4" />,
      text: `${modalityLabel}: Max sent ${climbMetrics.maxSentLabel}. Max tried ${climbMetrics.maxTriedLabel}.`,
      type: 'info'
    });

    // Volume
    insights.push({
      icon: <Target className="h-4 w-4" />,
      text: `Volumen: ${climbMetrics.totalAttempts} intentos, ${climbMetrics.sentCount} tops${climbMetrics.flashCount > 0 ? `, ${climbMetrics.flashCount} flashes` : ''}.`,
      type: 'info'
    });

    // Focus recommendation
    if (climbMetrics.hardAttempts > climbMetrics.totalAttempts * 0.5) {
      insights.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        text: 'Alto % de intentos en tu límite. Considera una sesión técnica/volumen hoy.',
        type: 'warning'
      });
    } else if (climbMetrics.sentCount > climbMetrics.totalAttempts * 0.8) {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        text: 'Buen ratio de tops. Puedes subir dificultad para progresar.',
        type: 'success'
      });
    } else {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        text: 'Foco del día: equilibra entre proyectos y volumen accesible.',
        type: 'info'
      });
    }

    return insights;
  };

  const generateRunningInsights = () => {
    if (!runningMetrics) return [];
    
    const insights: { icon: React.ReactNode; text: string; type: 'info' | 'warning' | 'success' }[] = [];
    
    // Summary
    const goalPct = Math.round(runningMetrics.goalProgressPct);
    insights.push({
      icon: <TrendingUp className="h-4 w-4" />,
      text: `Running: ${runningMetrics.weeklyDistanceKm.toFixed(1)}/${weeklyKmGoal} km (${goalPct}%). D+ ${Math.round(runningMetrics.weeklyElevationGainM)} m.`,
      type: goalPct >= 100 ? 'success' : 'info'
    });

    // Distance alert
    if (runningMetrics.distanceDeltaPct > 25) {
      insights.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `Ojo: subiste +${Math.round(runningMetrics.distanceDeltaPct)}% km vs la semana pasada. Modera la carga.`,
        type: 'warning'
      });
    } else if (runningMetrics.distanceDeltaPct < -20 && runningMetrics.weeklyDistanceKm > 0) {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        text: 'Volumen reducido esta semana. Buena semana de descarga o considera añadir una sesión.',
        type: 'info'
      });
    }

    // Focus recommendation
    if (runningMetrics.weeklyLoad > 500) {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        text: 'Carga alta. Próxima sesión: rodaje suave o descanso.',
        type: 'warning'
      });
    } else if (runningMetrics.goalProgressPct < 50) {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        text: 'Vas al 50% del objetivo. Añade una sesión corta si quieres cumplirlo.',
        type: 'info'
      });
    } else {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        text: 'Buen ritmo. Mantén consistencia y escucha a tu cuerpo.',
        type: 'success'
      });
    }

    return insights;
  };

  const insights = activeTab === 'climb' ? generateClimbInsights() : generateRunningInsights();

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="card-elevated border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" />
          Asistente
          <Badge variant="outline" className="text-xs font-normal">
            Solo guía, no crea sesiones
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li 
              key={i} 
              className={`flex items-start gap-2 text-sm ${
                insight.type === 'warning' 
                  ? 'text-warning' 
                  : insight.type === 'success' 
                    ? 'text-success' 
                    : 'text-muted-foreground'
              }`}
            >
              <span className="mt-0.5">{insight.icon}</span>
              <span>{insight.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
