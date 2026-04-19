export const FRENCH_ROUTE_GRADES = [
  '5a',
  '5a+',
  '5b',
  '5b+',
  '5c',
  '5c+',
  '6a',
  '6a+',
  '6b',
  '6b+',
  '6c',
  '6c+',
  '7a',
  '7a+',
  '7b',
  '7b+',
] as const;

export type FrenchRouteGrade = (typeof FRENCH_ROUTE_GRADES)[number];

export interface RoutePlanItem {
  id: string;
  grade: FrenchRouteGrade;
  count: number;
}

interface TemplateBlockLike {
  grade?: unknown;
  sets?: unknown;
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `route-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isFrenchRouteGrade(value: string): value is FrenchRouteGrade {
  return FRENCH_ROUTE_GRADES.includes(value as FrenchRouteGrade);
}

export function createRoutePlanItem(
  grade: FrenchRouteGrade = '6a',
  count = 1,
): RoutePlanItem {
  return {
    id: createId(),
    grade,
    count: Math.max(1, Math.round(count)),
  };
}

export function normalizeRoutePlan(plan: RoutePlanItem[]): RoutePlanItem[] {
  return plan
    .filter((item) => isFrenchRouteGrade(item.grade))
    .map((item) => ({
      ...item,
      count: Math.max(1, Math.round(item.count || 0)),
    }));
}

export function summarizeRoutePlan(plan: RoutePlanItem[]): string {
  const normalized = normalizeRoutePlan(plan);
  return normalized.map((item) => `${item.count}x${item.grade}`).join(', ');
}

export function getRoutePlanTotal(plan: RoutePlanItem[]): number {
  return normalizeRoutePlan(plan).reduce((total, item) => total + item.count, 0);
}

export function expandRoutePlan(plan: RoutePlanItem[]): Array<{
  grade: FrenchRouteGrade;
  orderIndex: number;
}> {
  const expanded: Array<{ grade: FrenchRouteGrade; orderIndex: number }> = [];
  let orderIndex = 0;

  normalizeRoutePlan(plan).forEach((item) => {
    for (let index = 0; index < item.count; index += 1) {
      expanded.push({
        grade: item.grade,
        orderIndex,
      });
      orderIndex += 1;
    }
  });

  return expanded;
}

export function buildRoutePlanFromTemplateBlocks(rawValue: string | null | undefined): RoutePlanItem[] {
  if (!rawValue) return [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const aggregated = new Map<FrenchRouteGrade, number>();
  const orderedGrades: FrenchRouteGrade[] = [];

  parsed.forEach((block) => {
    const typedBlock = block as TemplateBlockLike;
    const gradeValue = typeof typedBlock.grade === 'string' ? typedBlock.grade.trim() : '';
    const countValue =
      typeof typedBlock.sets === 'number'
        ? typedBlock.sets
        : typeof typedBlock.sets === 'string'
          ? Number.parseInt(typedBlock.sets, 10)
          : 0;

    if (!isFrenchRouteGrade(gradeValue) || !Number.isFinite(countValue) || countValue <= 0) {
      return;
    }

    if (!aggregated.has(gradeValue)) {
      orderedGrades.push(gradeValue);
      aggregated.set(gradeValue, 0);
    }

    aggregated.set(gradeValue, (aggregated.get(gradeValue) || 0) + Math.round(countValue));
  });

  return orderedGrades.map((grade) =>
    createRoutePlanItem(grade, aggregated.get(grade) || 1),
  );
}
