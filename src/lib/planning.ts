import type { Database } from '@/integrations/supabase/types';

export type BaseSessionType = Database['public']['Enums']['session_type'];
export type PlannedFocus =
  | 'boulder'
  | 'rope'
  | 'hybrid'
  | 'running'
  | 'bike'
  | 'strength'
  | 'campus'
  | 'training';

export interface PlanningOption {
  colorClass: string;
  description: string;
  label: string;
  sessionType: BaseSessionType;
  showDistance: boolean;
  showGym: boolean;
  showTime: boolean;
  value: PlannedFocus;
}

const PLANNED_FOCUS_PATTERN =
  /^\[\[focus:(boulder|rope|hybrid|running|bike|strength|campus|training)\]\]\s*/i;

export const planningOptions: Record<PlannedFocus, PlanningOption> = {
  boulder: {
    value: 'boulder',
    label: 'Escalada bloque',
    description: 'Sesión de búlder en rocódromo o roca',
    sessionType: 'boulder',
    colorClass: 'bg-orange-500',
    showDistance: false,
    showGym: true,
    showTime: true,
  },
  rope: {
    value: 'rope',
    label: 'Escalada vías',
    description: 'Autobelay, cuerda o continuidad en vías',
    sessionType: 'rope',
    colorClass: 'bg-blue-500',
    showDistance: false,
    showGym: true,
    showTime: true,
  },
  hybrid: {
    value: 'hybrid',
    label: 'Escalada mixta',
    description: 'Bloque y vías el mismo día',
    sessionType: 'hybrid',
    colorClass: 'bg-violet-500',
    showDistance: false,
    showGym: true,
    showTime: true,
  },
  running: {
    value: 'running',
    label: 'Running',
    description: 'Carrera, trail o rodaje controlado',
    sessionType: 'running',
    colorClass: 'bg-amber-500',
    showDistance: true,
    showGym: false,
    showTime: true,
  },
  bike: {
    value: 'bike',
    label: 'Bici',
    description: 'Carretera, gravel, MTB o rodillo',
    sessionType: 'bike',
    colorClass: 'bg-sky-500',
    showDistance: true,
    showGym: false,
    showTime: true,
  },
  strength: {
    value: 'strength',
    label: 'Fuerza',
    description: 'Trabajo general, gimnasio o fuerza específica',
    sessionType: 'training',
    colorClass: 'bg-emerald-500',
    showDistance: false,
    showGym: true,
    showTime: true,
  },
  campus: {
    value: 'campus',
    label: 'Campus',
    description: 'Campus board o potencia específica de dedos',
    sessionType: 'training',
    colorClass: 'bg-fuchsia-500',
    showDistance: false,
    showGym: true,
    showTime: true,
  },
  training: {
    value: 'training',
    label: 'Entrenamiento',
    description: 'Trabajo general sin foco específico',
    sessionType: 'training',
    colorClass: 'bg-green-500',
    showDistance: false,
    showGym: true,
    showTime: true,
  },
};

function getFallbackFocus(sessionType: BaseSessionType): PlannedFocus {
  switch (sessionType) {
    case 'boulder':
    case 'rope':
    case 'hybrid':
    case 'running':
    case 'bike':
      return sessionType;
    case 'training':
      return 'training';
    default:
      return 'training';
  }
}

export function getPlannedSessionMeta(
  sessionType: BaseSessionType,
  rawNotes: string | null | undefined,
): {
  focus: PlannedFocus;
  notes: string;
  option: PlanningOption;
} {
  const noteValue = rawNotes || '';
  const match = noteValue.match(PLANNED_FOCUS_PATTERN);
  const focus = (match?.[1]?.toLowerCase() as PlannedFocus | undefined) || getFallbackFocus(sessionType);
  const notes = noteValue.replace(PLANNED_FOCUS_PATTERN, '').trim();

  return {
    focus,
    notes,
    option: planningOptions[focus],
  };
}

export function encodePlannedSessionNotes(
  notes: string,
  focus: PlannedFocus,
): string | null {
  const trimmedNotes = notes.trim();
  const prefix = `[[focus:${focus}]]`;
  return trimmedNotes ? `${prefix}\n${trimmedNotes}` : prefix;
}
