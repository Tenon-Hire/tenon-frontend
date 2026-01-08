const rawFlag =
  process.env.NEXT_PUBLIC_TENON_DEBUG_PERF ??
  process.env.TENON_DEBUG_PERF ??
  '';

export const dashboardPerfDebugEnabled =
  rawFlag === '1' || rawFlag.toLowerCase() === 'true';

export function nowMs(): number | null {
  if (typeof performance === 'undefined') return null;
  if (typeof performance.now !== 'function') return null;
  return performance.now();
}

export function logPerf(
  label: string,
  startedAt?: number | null,
  extra?: Record<string, unknown>,
) {
  if (!dashboardPerfDebugEnabled) return;
  const now = nowMs();
  if (now === null) return;

  const payload: Record<string, unknown> = extra ? { ...extra } : {};
  if (typeof startedAt === 'number') {
    payload.durationMs = Math.round(now - startedAt);
  }
  payload.atMs = Math.round(now);

  // eslint-disable-next-line no-console
  console.info(`[tenon][perf] ${label}`, payload);
}
