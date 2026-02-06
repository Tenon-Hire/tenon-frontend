import { mapApiError } from '@/lib/api/errorMapping';
import { httpResult } from '@/lib/api/httpClient';
import { dashboardPerfDebugEnabled, logPerf, nowMs } from '../utils/perf';
import type { DashboardPayload } from './dashboardTypes';

export const isAbortError = (err: unknown) =>
  (err instanceof DOMException && err.name === 'AbortError') ||
  (err &&
    typeof err === 'object' &&
    (err as { name?: unknown }).name === 'AbortError');

export async function fetchDashboard(signal?: AbortSignal) {
  const startedAt = nowMs();
  try {
    const result = await httpResult<DashboardPayload>(
      '/dashboard',
      { cache: 'no-store', signal, cacheTtlMs: 9000 },
      { basePath: '/api', skipAuth: true },
    );

    if (dashboardPerfDebugEnabled)
      logPerf('/api/dashboard response', startedAt, {
        status: result.ok ? 200 : (result.error.status ?? 'error'),
      });

    if (!result.ok) {
      const mapped = mapApiError(
        result.error,
        'Unable to load your dashboard.',
        'recruiter',
      );
      mapped.redirect?.();
      const error = new Error(mapped.message) as Error & { status?: number };
      error.status = mapped.status ?? undefined;
      throw error;
    }

    return { ...result.data, requestId: result.requestId ?? null };
  } catch (err) {
    if (isAbortError(err)) throw err;
    const status =
      err && typeof err === 'object'
        ? (err as { status?: unknown }).status
        : null;
    if (dashboardPerfDebugEnabled)
      logPerf('/api/dashboard response', startedAt, {
        status: status ?? 'error',
      });
    throw err;
  }
}
