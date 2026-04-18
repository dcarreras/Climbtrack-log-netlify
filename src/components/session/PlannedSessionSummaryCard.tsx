import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Play,
  Puzzle,
  Settings2,
  Sparkles,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getPlannedSessionMeta, type BaseSessionType } from '@/lib/planning';

interface PlannedSessionData {
  id: string;
  session_type: BaseSessionType;
  trainer_notes: string | null;
  notes: string | null;
  distance_km?: number | null;
  time_min?: number | null;
}

interface PlannedSessionSummaryCardProps {
  session: PlannedSessionData;
  onStart: () => void;
}

function extractBullets(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[•*-]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

function getIntent(session: PlannedSessionData): string {
  const { focus } = getPlannedSessionMeta(session.session_type, session.notes);
  switch (focus) {
    case 'boulder':
      return 'Prioriza volumen útil y bloques que te den calidad técnica sin quemarte pronto.';
    case 'rope':
      return 'Busca continuidad, ritmo y decisiones limpias en vías o autobelay.';
    case 'hybrid':
      return 'Combina volumen de escalada y algo de intensidad sin perder control de la fatiga.';
    case 'strength':
      return 'Busca fuerza de calidad, descansos completos y ejecución limpia en cada serie.';
    case 'campus':
      return 'Trata el campus como trabajo neural: pocos contactos, calidad alta y mucha recuperación.';
    case 'training':
      return 'Sesión de apoyo para sumar trabajo útil sin interferir con la escalada principal.';
    case 'running':
      return 'Suma carrera útil sin comprometer la recuperación para escalar fuerte después.';
    case 'bike':
      return 'Usa la bici para sumar volumen aeróbico o trabajo de calidad sin meter impacto extra.';
    default:
      return 'Haz la sesión de forma simple, controlada y con margen para recuperar bien.';
  }
}

function getStructure(session: PlannedSessionData): string[] {
  const { notes } = getPlannedSessionMeta(session.session_type, session.notes);
  const source = [session.trainer_notes, notes].filter(Boolean).join('\n');
  const bullets = extractBullets(source);

  if (bullets.length > 0) {
    return bullets.slice(0, 5);
  }

  const { focus } = getPlannedSessionMeta(session.session_type, session.notes);

  if (focus === 'running') {
    const distance = session.distance_km ? `${session.distance_km} km` : 'distancia libre';
    const time = session.time_min ? `${session.time_min} min` : 'duración libre';
    return [
      `Calienta 10-15 min y revisa sensaciones antes de salir.`,
      `Completa el bloque principal en torno a ${distance} o ${time}.`,
      `Termina con 5-10 min suaves y movilidad breve.`,
    ];
  }

  if (focus === 'bike') {
    const distance = session.distance_km ? `${session.distance_km} km` : 'distancia libre';
    const time = session.time_min ? `${session.time_min} min` : 'duración libre';
    return [
      'Empieza con 10-15 min suaves y sube cadencia de forma progresiva.',
      `Haz el bloque principal alrededor de ${distance} o ${time}, según el objetivo del día.`,
      'Cierra con pedaleo fácil y algo de movilidad de cadera y espalda.',
    ];
  }

  return [
    'Empieza por una entrada en calor corta y progresiva.',
    'Haz el bloque principal con descanso suficiente entre intentos o series.',
    'Cierra con volumen fácil o vuelta a la calma según sensaciones.',
  ];
}

function getKeyPoints(session: PlannedSessionData): string[] {
  const sessionSpecific: Record<string, string[]> = {
    boulder: [
      'Máximo 3 intentos seguidos por bloque duro antes de cambiar.',
      'Pies silenciosos y cadera cerca de la pared.',
      'Descansa bien entre pegue y pegue para mantener calidad.',
    ],
    rope: [
      'Ritmo estable y lectura previa antes de entrar en la vía.',
      'Respira y recupera en reposos obvios.',
      'No conviertas la sesión en una guerra de intentos si hoy no toca.',
    ],
    hybrid: [
      'Empieza por la parte técnica antes de la más física.',
      'No dejes que la segunda mitad de la sesión se vuelva desordenada.',
      'Mantén margen para recuperar al día siguiente.',
    ],
    training: [
      'Suma trabajo útil, no fatiga vacía.',
      'Cuida la ejecución y corta antes de degradar técnica.',
      'Prioriza calidad sobre cantidad total.',
    ],
    strength: [
      'Descansa de verdad entre series pesadas.',
      'No sacrifiques rango ni postura por completar una repetición.',
      'Quédate con margen si la velocidad cae demasiado.',
    ],
    campus: [
      'Calienta dedos, hombros y escápulas antes del primer contacto duro.',
      'Pocas series, mucha calidad y nada de perseguir fatiga.',
      'Corta al primer signo de pérdida de precisión o dolor raro en dedos/codos.',
    ],
    running: [
      'Ritmo controlado desde el principio.',
      'Hombros sueltos y zancada corta si sales cansado de escalar.',
      'Si la respiración se dispara pronto, baja un punto la intensidad.',
    ],
    bike: [
      'Cadencia estable y hombros relajados para no cargar de más la parte alta.',
      'Controla el esfuerzo por sensaciones o pulso, no solo por velocidad.',
      'Si el objetivo es aeróbico, evita picos largos fuera de zona.',
    ],
  };

  const { focus } = getPlannedSessionMeta(session.session_type, session.notes);
  return sessionSpecific[focus] ?? sessionSpecific.training;
}

function getLimits(session: PlannedSessionData): string[] {
  const { focus } = getPlannedSessionMeta(session.session_type, session.notes);

  if (focus === 'running') {
    return [
      'Evita convertirla en sesión dura si vienes de escalada intensa en 48h.',
      'Si notas piernas pesadas, recorta volumen antes que forzar el ritmo.',
    ];
  }

  if (focus === 'bike') {
    return [
      'No conviertas una salida regenerativa en una sesión de series improvisada.',
      'Si vienes cargado de dedos, hombros o lumbar, baja desarrollo y duración.',
    ];
  }

  if (focus === 'campus') {
    return [
      'No metas campus si vienes con dedos o codos cargados.',
      'Corta antes de que aparezca contacto torpe o dolor puntual.',
    ];
  }

  return [
    'Corta la sesión si baja mucho la calidad técnica.',
    'No mezcles demasiado volumen y demasiada intensidad el mismo día.',
  ];
}

export default function PlannedSessionSummaryCard({
  session,
  onStart,
}: PlannedSessionSummaryCardProps) {
  const [showFullPlan, setShowFullPlan] = useState(false);
  const { option, notes } = getPlannedSessionMeta(session.session_type, session.notes);

  const summary = useMemo(() => {
    return {
      intencion: getIntent(session),
      estructura: getStructure(session),
      claves: getKeyPoints(session),
      limites: getLimits(session),
    };
  }, [session]);

  const fullPlanText = [session.trainer_notes, notes].filter(Boolean).join('\n\n');

  return (
    <Card className="card-elevated border-primary/30 mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Resumen de hoy
          </CardTitle>
          <Badge variant="secondary" className="text-xs capitalize">
            {option.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground">Intención</span>
            <p className="text-sm font-medium">{summary.intencion}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Puzzle className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Estructura</span>
            <ul className="mt-1 space-y-1 text-sm">
              {summary.estructura.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Settings2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Claves</span>
            <ul className="mt-1 space-y-1 text-sm">
              {summary.claves.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-green-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Límites</span>
            <ul className="mt-1 space-y-1 text-sm">
              {summary.limites.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-orange-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {fullPlanText && (
          <Collapsible open={showFullPlan} onOpenChange={setShowFullPlan}>
            <CollapsibleTrigger className="flex w-full justify-center gap-2 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <FileText className="h-3 w-3" />
              {showFullPlan ? 'Ocultar plan completo' : 'Ver plan completo'}
              {showFullPlan ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                {fullPlanText}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={onStart} className="flex-1" size="lg">
            <Play className="mr-2 h-4 w-4" />
            Empezar sesión
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
