import type { Database } from '@/integrations/supabase/types';

export type BoulderColorBand = Database['public']['Enums']['color_band'];

export interface BoulderColorOption {
  aliases: string[];
  className: string;
  label: string;
  value: BoulderColorBand;
}

export const BOULDER_COLOR_OPTIONS: BoulderColorOption[] = [
  {
    value: 'white',
    label: 'Blanco',
    className: 'bg-white text-gray-900 border border-gray-300',
    aliases: ['white', 'blanco'],
  },
  {
    value: 'blue',
    label: 'Azul',
    className: 'bg-blue-500 text-white',
    aliases: ['blue', 'azul'],
  },
  {
    value: 'green',
    label: 'Verde',
    className: 'bg-green-500 text-white',
    aliases: ['green', 'verde'],
  },
  {
    value: 'yellow',
    label: 'Amarillo',
    className: 'bg-yellow-400 text-gray-900',
    aliases: ['yellow', 'amarillo'],
  },
  {
    value: 'red',
    label: 'Rojo',
    className: 'bg-red-500 text-white',
    aliases: ['red', 'rojo'],
  },
  {
    value: 'orange',
    label: 'Naranja',
    className: 'bg-orange-500 text-white',
    aliases: ['orange', 'naranja'],
  },
  {
    value: 'purple',
    label: 'Morado',
    className: 'bg-purple-600 text-white',
    aliases: ['purple', 'morado', 'violeta'],
  },
  {
    value: 'pink',
    label: 'Rosa',
    className: 'bg-pink-500 text-white',
    aliases: ['pink', 'rosa'],
  },
  {
    value: 'black',
    label: 'Negro',
    className: 'bg-gray-900 text-white',
    aliases: ['black', 'negro'],
  },
] as const;

export interface BoulderPlanItem {
  colorBand: BoulderColorBand;
  count: number;
  id: string;
}

interface TemplateBlockLike {
  grade?: unknown;
  sets?: unknown;
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `boulder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function isBoulderColorBand(value: string): value is BoulderColorBand {
  return BOULDER_COLOR_OPTIONS.some((option) => option.value === value);
}

export function getBoulderColorOption(colorBand: BoulderColorBand | null | undefined) {
  if (!colorBand) return null;
  return BOULDER_COLOR_OPTIONS.find((option) => option.value === colorBand) || null;
}

export function getBoulderColorLabel(colorBand: BoulderColorBand | null | undefined) {
  return getBoulderColorOption(colorBand)?.label || 'Sin color';
}

export function normalizeBoulderColor(rawValue: string | null | undefined): BoulderColorBand | null {
  if (!rawValue) return null;

  const normalized = normalizeToken(rawValue);
  const option = BOULDER_COLOR_OPTIONS.find(
    (candidate) =>
      candidate.value === normalized || candidate.aliases.some((alias) => alias === normalized),
  );

  return option?.value || null;
}

export function createBoulderPlanItem(
  colorBand: BoulderColorBand = 'blue',
  count = 1,
): BoulderPlanItem {
  return {
    colorBand,
    count: Math.max(1, Math.round(count)),
    id: createId(),
  };
}

export function normalizeBoulderPlan(plan: BoulderPlanItem[]): BoulderPlanItem[] {
  return plan
    .filter((item) => isBoulderColorBand(item.colorBand))
    .map((item) => ({
      ...item,
      count: Math.max(1, Math.round(item.count || 0)),
    }));
}

export function summarizeBoulderPlan(plan: BoulderPlanItem[]) {
  return normalizeBoulderPlan(plan)
    .map((item) => `${item.count}x${getBoulderColorLabel(item.colorBand)}`)
    .join(', ');
}

export function getBoulderPlanTotal(plan: BoulderPlanItem[]) {
  return normalizeBoulderPlan(plan).reduce((total, item) => total + item.count, 0);
}

export function expandBoulderPlan(plan: BoulderPlanItem[]): Array<{
  colorBand: BoulderColorBand;
  orderIndex: number;
}> {
  const expanded: Array<{ colorBand: BoulderColorBand; orderIndex: number }> = [];
  let orderIndex = 0;

  normalizeBoulderPlan(plan).forEach((item) => {
    for (let index = 0; index < item.count; index += 1) {
      expanded.push({
        colorBand: item.colorBand,
        orderIndex,
      });
      orderIndex += 1;
    }
  });

  return expanded;
}

export function buildBoulderPlanFromTemplateBlocks(rawValue: string | null | undefined): {
  ignoredValues: string[];
  plan: BoulderPlanItem[];
} {
  if (!rawValue) {
    return {
      ignoredValues: [],
      plan: [],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return {
      ignoredValues: [],
      plan: [],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      ignoredValues: [],
      plan: [],
    };
  }

  const aggregated = new Map<BoulderColorBand, number>();
  const orderedColors: BoulderColorBand[] = [];
  const ignored = new Set<string>();

  parsed.forEach((block) => {
    const typedBlock = block as TemplateBlockLike;
    const gradeValue = typeof typedBlock.grade === 'string' ? typedBlock.grade.trim() : '';
    const countValue =
      typeof typedBlock.sets === 'number'
        ? typedBlock.sets
        : typeof typedBlock.sets === 'string'
          ? Number.parseInt(typedBlock.sets, 10)
          : 0;

    if (!gradeValue || !Number.isFinite(countValue) || countValue <= 0) {
      return;
    }

    const normalizedColor = normalizeBoulderColor(gradeValue);
    if (!normalizedColor) {
      ignored.add(gradeValue);
      return;
    }

    if (!aggregated.has(normalizedColor)) {
      orderedColors.push(normalizedColor);
      aggregated.set(normalizedColor, 0);
    }

    aggregated.set(normalizedColor, (aggregated.get(normalizedColor) || 0) + Math.round(countValue));
  });

  return {
    ignoredValues: Array.from(ignored),
    plan: orderedColors.map((colorBand) =>
      createBoulderPlanItem(colorBand, aggregated.get(colorBand) || 1),
    ),
  };
}
