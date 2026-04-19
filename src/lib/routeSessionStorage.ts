export type ActiveRouteWizardStep = 'plan' | 'confirm' | 'active' | 'finish';

export interface ActiveRouteSnapshot {
  sessionId: string | null;
  step: ActiveRouteWizardStep;
  updatedAt: string;
}

const ACTIVE_SESSION_ID_KEY = 'climbtracker.activeSessionId';
const ACTIVE_ROUTE_SNAPSHOT_KEY = 'climbtracker.activeRouteSnapshot';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getStoredActiveSessionId(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACTIVE_SESSION_ID_KEY);
}

export function setStoredActiveSessionId(sessionId: string | null) {
  if (!canUseStorage()) return;

  if (sessionId) {
    window.localStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId);
    return;
  }

  window.localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
}

export function getActiveRouteSnapshot(): ActiveRouteSnapshot | null {
  if (!canUseStorage()) return null;

  const rawValue = window.localStorage.getItem(ACTIVE_ROUTE_SNAPSHOT_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as ActiveRouteSnapshot;
    if (!parsed || !parsed.step) return null;
    return parsed;
  } catch {
    window.localStorage.removeItem(ACTIVE_ROUTE_SNAPSHOT_KEY);
    return null;
  }
}

export function saveActiveRouteSnapshot(snapshot: ActiveRouteSnapshot) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACTIVE_ROUTE_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function clearActiveRouteStorage() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  window.localStorage.removeItem(ACTIVE_ROUTE_SNAPSHOT_KEY);
}
