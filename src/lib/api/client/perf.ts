import type { HttpMethod } from './shapes';

function isDebugPerfEnabled() {
  const flag = (process.env.NEXT_PUBLIC_TENON_DEBUG_PERF ?? '').toLowerCase();
  return flag === '1' || flag === 'true';
}

const SENSITIVE_KEYS = ['token', 'authorization', 'secret', 'code', 'password'];

function nowMs() {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
  ) {
    return performance.now();
  }
  return Date.now();
}

export function sanitizePath(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost');
    const safePath = parsed.pathname
      .split('/')
      .map((segment, index) =>
        index === 0 || segment.length <= 32 ? segment : '[id]',
      )
      .join('/');

    const params = new URLSearchParams(parsed.search);
    params.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
        params.set(key, '[redacted]');
        return;
      }
      if (value.length > 48) {
        params.set(key, '[id]');
      }
    });
    const qs = params.toString();
    return qs ? `${safePath}?${qs}` : safePath;
  } catch {
    const [pathPart, queryPart] = url.split('?');
    const safePath = pathPart
      .split('/')
      .map((segment, index) =>
        index === 0 || segment.length <= 32 ? segment : '[id]',
      )
      .join('/');
    if (!queryPart) return safePath;
    const safeQuery = queryPart.replace(/[A-Za-z0-9_-]{48,}/g, '[id]');
    return `${safePath}?${safeQuery}`;
  }
}

type PerfStatus = number | 'error' | 'network' | 'cache';

export function logRequestPerf(
  method: HttpMethod,
  targetUrl: string,
  status: PerfStatus,
  startedAt: number | null,
  cacheMode?: string,
) {
  if (!isDebugPerfEnabled() || startedAt === null) return;
  const durationMs = Math.round(nowMs() - startedAt);
  const safeUrl = sanitizePath(targetUrl);
  const payload: Record<string, unknown> = { status, durationMs };
  if (cacheMode) payload.cache = cacheMode;
  // eslint-disable-next-line no-console
  console.info(`[api][perf] ${method} ${safeUrl}`, payload);
}

export { isDebugPerfEnabled as DEBUG_PERF, nowMs };
