interface TimedSessionLike {
  paused_at?: string | null;
  paused_ms?: number | null;
  started_at?: string | null;
}

export function getElapsedSessionMs(session: TimedSessionLike, now = Date.now()) {
  if (!session.started_at) return 0;

  const startedAtMs = new Date(session.started_at).getTime();
  if (Number.isNaN(startedAtMs)) return 0;

  const pausedBase = session.paused_ms || 0;

  if (session.paused_at) {
    const pausedAtMs = new Date(session.paused_at).getTime();
    if (Number.isNaN(pausedAtMs)) return Math.max(0, now - startedAtMs - pausedBase);
    return Math.max(0, pausedAtMs - startedAtMs - pausedBase);
  }

  return Math.max(0, now - startedAtMs - pausedBase);
}

export function getElapsedSessionMinutes(session: TimedSessionLike, now = Date.now()) {
  const elapsedMs = getElapsedSessionMs(session, now);
  return Math.max(1, Math.round(elapsedMs / 60000));
}

export function formatElapsedMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
