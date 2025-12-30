import { startOfWeek, endOfWeek, subWeeks, parseISO, isWithinInterval } from 'date-fns';
import { boulderColorToIndex, frenchGradeToIndex, indexToBoulderColor, indexToFrenchGrade, getBoulderDisplayLabel } from './gradeUtils';

export interface ClimbData {
  id: string;
  discipline: 'boulder' | 'route';
  color_band?: string | null;
  grade_value?: string | null;
  grade_system?: string | null;
  sent: boolean;
  flash?: boolean;
  attempts: number;
  session_id: string;
}

export interface SessionData {
  id: string;
  date: string;
  session_type: string;
  duration_min?: number | null;
  time_min?: number | null;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
  rpe_1_10?: number | null;
  climbs?: ClimbData[];
}

export type Modality = 'boulder' | 'autobelay' | 'rope';

// Filter climbs by modality
export const filterClimbsByModality = (climbs: ClimbData[], modality: Modality): ClimbData[] => {
  if (modality === 'boulder') {
    return climbs.filter(c => c.discipline === 'boulder');
  }
  // autobelay and rope are both "route" discipline
  return climbs.filter(c => c.discipline === 'route');
};

// Get weekly sessions grouped by ISO week
export const getWeeklySessions = (sessions: SessionData[], weeksBack: number = 4) => {
  const now = new Date();
  const weeks: { weekStart: Date; weekEnd: Date; sessions: SessionData[] }[] = [];
  
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    
    const weekSessions = sessions.filter(s => {
      const sessionDate = parseISO(s.date);
      return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
    });
    
    weeks.push({ weekStart, weekEnd, sessions: weekSessions });
  }
  
  return weeks;
};

// CLIMB METRICS
export interface ClimbWeeklyMetrics {
  weekLabel: string;
  weekStart: Date;
  // Core metrics
  maxSentIndex: number;
  maxSentLabel: string;
  maxTriedIndex: number;
  maxTriedLabel: string;
  avgWeightedIndex: number;
  avgWeightedLabel: string;
  // Volume
  totalAttempts: number;
  sentCount: number;
  triedCount: number;
  flashCount: number;
  // Time
  totalDurationMin: number;
  // Quality flags
  hardAttempts: number;
}

export const calculateClimbMetrics = (
  sessions: SessionData[],
  modality: Modality,
  weeksBack: number = 4
): ClimbWeeklyMetrics[] => {
  const weeks = getWeeklySessions(sessions, weeksBack);
  const isBoulder = modality === 'boulder';
  
  return weeks.map(({ weekStart, weekEnd, sessions: weekSessions }) => {
    // Get all climbs for this modality
    const allClimbs = weekSessions.flatMap(s => filterClimbsByModality(s.climbs || [], modality));
    
    // Calculate indices
    const sentClimbs = allClimbs.filter(c => c.sent);
    const triedClimbs = allClimbs.filter(c => !c.sent);
    
    const getIndex = (climb: ClimbData) => 
      isBoulder 
        ? boulderColorToIndex(climb.color_band) 
        : frenchGradeToIndex(climb.grade_value);
    
    const getLabel = (index: number) => {
      if (index === 0) return '-';
      if (isBoulder) {
        const color = indexToBoulderColor(index);
        return color ? getBoulderDisplayLabel(color) : '-';
      }
      return indexToFrenchGrade(index) || '-';
    };
    
    // Max sent
    const sentIndices = sentClimbs.map(getIndex).filter(i => i > 0);
    const maxSentIndex = sentIndices.length > 0 ? Math.max(...sentIndices) : 0;
    
    // Max tried
    const triedIndices = triedClimbs.map(getIndex).filter(i => i > 0);
    const maxTriedIndex = triedIndices.length > 0 ? Math.max(...triedIndices) : 0;
    
    // Weighted average
    let totalWeight = 0;
    let weightedSum = 0;
    allClimbs.forEach(climb => {
      const index = getIndex(climb);
      if (index > 0) {
        weightedSum += index * climb.attempts;
        totalWeight += climb.attempts;
      }
    });
    const avgWeightedIndex = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    
    // Volume
    const totalAttempts = allClimbs.reduce((sum, c) => sum + c.attempts, 0);
    const sentCount = sentClimbs.length;
    const triedCount = triedClimbs.length;
    const flashCount = allClimbs.filter(c => c.flash).length;
    
    // Time
    const climbingSessions = weekSessions.filter(s => 
      s.session_type === 'boulder' || s.session_type === 'rope' || s.session_type === 'hybrid'
    );
    const totalDurationMin = climbingSessions.reduce((sum, s) => sum + (s.duration_min || 0), 0);
    
    // Hard attempts (attempts at avg + 1 or higher)
    const hardAttempts = allClimbs.filter(c => getIndex(c) >= avgWeightedIndex + 1).length;
    
    return {
      weekLabel: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
      weekStart,
      maxSentIndex,
      maxSentLabel: getLabel(maxSentIndex),
      maxTriedIndex,
      maxTriedLabel: getLabel(maxTriedIndex),
      avgWeightedIndex,
      avgWeightedLabel: getLabel(avgWeightedIndex),
      totalAttempts,
      sentCount,
      triedCount,
      flashCount,
      totalDurationMin,
      hardAttempts,
    };
  });
};

// RUNNING METRICS
export interface RunningWeeklyMetrics {
  weekLabel: string;
  weekStart: Date;
  weeklyTimeMin: number;
  weeklyDistanceKm: number;
  weeklyElevationGainM: number;
  goalProgressPct: number;
  weeklyLoad: number;
  distanceDeltaPct: number;
  sessionCount: number;
}

export const calculateRunningMetrics = (
  sessions: SessionData[],
  weeklyKmGoal: number,
  weeksBack: number = 4
): RunningWeeklyMetrics[] => {
  const weeks = getWeeklySessions(sessions, weeksBack);
  
  return weeks.map(({ weekStart, weekEnd, sessions: weekSessions }, index) => {
    const runningSessions = weekSessions.filter(s => s.session_type === 'running');
    
    const weeklyTimeMin = runningSessions.reduce((sum, s) => sum + (s.duration_min || s.time_min || 0), 0);
    const weeklyDistanceKm = runningSessions.reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0);
    const weeklyElevationGainM = runningSessions.reduce((sum, s) => sum + (Number(s.elevation_gain_m) || 0), 0);
    const goalProgressPct = weeklyKmGoal > 0 ? (weeklyDistanceKm / weeklyKmGoal) * 100 : 0;
    
    // Weekly load (duration * RPE)
    const weeklyLoad = runningSessions.reduce((sum, s) => {
      const duration = s.duration_min || s.time_min || 0;
      const rpe = s.rpe_1_10 || 5; // default RPE if not set
      return sum + (duration * rpe);
    }, 0);
    
    // Distance delta vs previous week
    let distanceDeltaPct = 0;
    if (index > 0) {
      const prevWeekSessions = weeks[index - 1].sessions.filter(s => s.session_type === 'running');
      const prevWeekKm = prevWeekSessions.reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0);
      if (prevWeekKm > 0) {
        distanceDeltaPct = ((weeklyDistanceKm - prevWeekKm) / prevWeekKm) * 100;
      }
    }
    
    return {
      weekLabel: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
      weekStart,
      weeklyTimeMin,
      weeklyDistanceKm,
      weeklyElevationGainM,
      goalProgressPct,
      weeklyLoad,
      distanceDeltaPct,
      sessionCount: runningSessions.length,
    };
  });
};

// Get current week metrics
export const getCurrentWeekClimbMetrics = (sessions: SessionData[], modality: Modality) => {
  const metrics = calculateClimbMetrics(sessions, modality, 1);
  return metrics[0] || null;
};

export const getCurrentWeekRunningMetrics = (sessions: SessionData[], weeklyKmGoal: number) => {
  const metrics = calculateRunningMetrics(sessions, weeklyKmGoal, 2);
  const current = metrics[metrics.length - 1] || null;
  const previous = metrics.length > 1 ? metrics[metrics.length - 2] : null;
  
  if (current && previous) {
    const prevKm = previous.weeklyDistanceKm;
    current.distanceDeltaPct = prevKm > 0 
      ? ((current.weeklyDistanceKm - prevKm) / prevKm) * 100 
      : 0;
  }
  
  return current;
};
