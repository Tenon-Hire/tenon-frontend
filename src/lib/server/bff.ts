import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAccessToken, getSessionNormalized } from '@/lib/auth0';
import { extractPermissions, hasPermission } from '@/lib/auth0-claims';
import { BRAND_SLUG } from '@/lib/brand';
import type { Dispatcher } from 'undici';

export const UPSTREAM_HEADER = `x-${BRAND_SLUG}-upstream-status`;
export const REQUEST_ID_HEADER = 'x-tenon-request-id';
const DEBUG_PERF = process.env.TENON_DEBUG_PERF;
const USE_FETCH_DISPATCHER =
  process.env.TENON_USE_FETCH_DISPATCHER === '1' ||
  process.env.TENON_USE_FETCH_DISPATCHER === 'true';

let AgentCtor: typeof import('undici').Agent | null = null;
let sharedDispatcher: Dispatcher | null = null;

function getFetchDispatcher(): Dispatcher | undefined {
  if (!USE_FETCH_DISPATCHER) return undefined;
  if (
    typeof MessageChannel === 'undefined' ||
    typeof MessagePort === 'undefined' ||
    typeof ReadableStream === 'undefined'
  ) {
    return undefined;
  }
  if (!AgentCtor) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      AgentCtor = require('undici').Agent;
    } catch {
      return undefined;
    }
  }
  if (!AgentCtor) return undefined;
  if (sharedDispatcher) return sharedDispatcher;
  sharedDispatcher = new AgentCtor({
    keepAliveTimeout: 10_000,
    keepAliveMaxTimeout: 15_000,
    headersTimeout: 30_000,
    connections: 100,
  });
  return sharedDispatcher;
}

function stripTrailingApi(raw: string) {
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

export function getBackendBaseUrl(): string {
  const raw = process.env.TENON_BACKEND_BASE_URL ?? 'http://localhost:8000';
  return stripTrailingApi(raw);
}

export async function parseUpstreamBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return (await res.json()) as unknown;
    } catch {
      return undefined;
    }
  }

  try {
    return await res.text();
  } catch {
    return undefined;
  }
}

function jitteredBackoffMs(attempt: number, base = 150, cap = 1000) {
  const exp = base * 2 ** (attempt - 1);
  const jitter = Math.random() * 100;
  return Math.min(cap, exp + jitter);
}

function parseRetryAfterMs(raw: string | null, nowMs: number, capMs = 2000) {
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return Math.min(capMs, numeric * 1000);
  }

  const dateVal = Date.parse(raw);
  if (!Number.isNaN(dateVal) && dateVal > 0) {
    const delta = dateVal - nowMs;
    if (delta > 0) return Math.min(capMs, delta);
  }

  return null;
}

export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    const maybe = (crypto as { randomUUID?: () => string }).randomUUID;
    if (typeof maybe === 'function') return maybe();
  }
  try {
    return randomUUID();
  } catch {
    return `req-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
  }
}

export function readRequestId(
  headers?: Headers | { get?: (key: string) => string | null },
): string | null {
  if (!headers || typeof headers.get !== 'function') return null;
  const existing = headers.get(REQUEST_ID_HEADER);
  return existing && typeof existing === 'string' ? existing : null;
}

export function resolveRequestId(
  headers?: Headers | { get?: (key: string) => string | null },
  fallback?: string,
): string {
  return readRequestId(headers) ?? fallback ?? generateRequestId();
}

type RobustFetchOptions = {
  url: string;
  init: RequestInit;
  requestId: string;
  timeoutMs?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffCapMs?: number;
  maxTotalTimeMs?: number;
};

function waitWithAbort(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const cleanup = () => {
      clearTimeout(timer);
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      cleanup();
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

async function robustFetch({
  url,
  init,
  requestId,
  timeoutMs = 15000,
  maxAttempts,
  backoffBaseMs = 150,
  backoffCapMs = 1000,
  maxTotalTimeMs,
}: RobustFetchOptions): Promise<Response> {
  const method = (init.method ?? 'GET').toString().toUpperCase();
  const retryable = method === 'GET' || method === 'HEAD';
  const attempts = retryable ? (maxAttempts ?? 3) : 1;
  const startTime = Date.now();

  const headers = new Headers(init.headers ?? {});
  headers.set(REQUEST_ID_HEADER, requestId);

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const elapsed = Date.now() - startTime;
    const remainingBudget =
      typeof maxTotalTimeMs === 'number' ? maxTotalTimeMs - elapsed : null;
    if (remainingBudget !== null && remainingBudget <= 0) {
      throw new Error('Request exceeded max total time');
    }
    const effectiveTimeout =
      remainingBudget !== null
        ? Math.min(timeoutMs, remainingBudget)
        : timeoutMs;
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, effectiveTimeout);

    let routeAbortListener: (() => void) | undefined;
    if (init.signal) {
      if ((init.signal as AbortSignal).aborted) {
        clearTimeout(timeoutId);
        throw (
          (init.signal as AbortSignal).reason ??
          new DOMException('Aborted', 'AbortError')
        );
      }
      routeAbortListener = () =>
        controller.abort((init.signal as AbortSignal).reason);
      (init.signal as AbortSignal).addEventListener(
        'abort',
        routeAbortListener,
        {
          once: true,
        },
      );
    }

    try {
      const dispatcher = getFetchDispatcher();
      const upstream = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
        redirect: 'manual',
        ...(dispatcher ? { dispatcher } : {}),
      });
      clearTimeout(timeoutId);

      const shouldRetryStatus =
        upstream.status === 502 ||
        upstream.status === 503 ||
        upstream.status === 504 ||
        upstream.status === 429;

      if (retryable && attempt < attempts && shouldRetryStatus) {
        if (typeof upstream.body?.cancel === 'function') {
          await upstream.body.cancel().catch(() => undefined);
        } else {
          await upstream.arrayBuffer().catch(() => undefined);
        }

        let delayMs = jitteredBackoffMs(attempt, backoffBaseMs, backoffCapMs);
        if (upstream.status === 429) {
          const retryAfterRaw = upstream.headers.get('retry-after');
          const parsedRetryAfter = parseRetryAfterMs(
            retryAfterRaw,
            Date.now(),
            2000,
          );
          if (parsedRetryAfter !== null && parsedRetryAfter > 0) {
            delayMs = parsedRetryAfter;
          }
        }
        const delayBudget =
          remainingBudget !== null
            ? Math.min(
                delayMs,
                Math.max(0, maxTotalTimeMs! - (Date.now() - startTime)),
              )
            : delayMs;
        if (remainingBudget !== null && delayBudget <= 0) {
          throw new Error('Request exceeded max total time');
        }
        await waitWithAbort(
          delayBudget,
          init.signal as AbortSignal | undefined,
        );
        continue;
      }

      (upstream as unknown as { _tenonMeta?: unknown })._tenonMeta = {
        attempts: attempt,
        durationMs: Date.now() - startTime,
      };
      return upstream;
    } catch (err) {
      clearTimeout(timeoutId);

      if (timedOut) {
        throw new Error(`Request timed out after ${effectiveTimeout}ms`);
      }

      if (init.signal && (init.signal as AbortSignal).aborted && !timedOut) {
        throw (init.signal as AbortSignal).reason ?? err;
      }

      if (retryable && attempt < attempts) {
        lastError = err;
        let delay = jitteredBackoffMs(attempt, backoffBaseMs, backoffCapMs);
        if (remainingBudget !== null) {
          delay = Math.min(
            delay,
            Math.max(0, maxTotalTimeMs! - (Date.now() - startTime)),
          );
          if (delay <= 0) {
            throw new Error('Request exceeded max total time');
          }
        }
        await waitWithAbort(delay, init.signal as AbortSignal | undefined);
        continue;
      }

      throw err;
    } finally {
      if (init.signal && routeAbortListener) {
        (init.signal as AbortSignal).removeEventListener(
          'abort',
          routeAbortListener,
        );
      }
    }
  }

  throw lastError ?? new Error('Upstream request failed');
}

type UpstreamRequestOptions = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  cache?: RequestCache;
  requestId: string;
  timeoutMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
  maxTotalTimeMs?: number;
};

export async function upstreamRequest(options: UpstreamRequestOptions) {
  const method = (options.method ?? 'GET').toUpperCase();
  const retryable = method === 'GET' || method === 'HEAD';

  const headers = {
    ...(options.headers ?? {}),
  };

  const body =
    method === 'GET' || method === 'HEAD'
      ? undefined
      : options.body === undefined
        ? undefined
        : options.body;

  return robustFetch({
    url: options.url,
    requestId: options.requestId,
    timeoutMs: options.timeoutMs,
    maxAttempts: retryable ? (options.maxAttempts ?? 3) : 1,
    maxTotalTimeMs: options.maxTotalTimeMs ?? options.timeoutMs,
    init: {
      method,
      headers,
      body,
      cache: options.cache ?? 'no-store',
      signal: options.signal,
    },
  });
}

export async function ensureAccessToken(
  requiredPermission?: string,
): Promise<NextResponse | { accessToken: string }> {
  const session = await getSessionNormalized();
  if (!session) {
    if (process.env.TENON_DEBUG_AUTH) {
      // eslint-disable-next-line no-console
      console.debug('[auth] no session available');
    }
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  if (requiredPermission) {
    const permissions = extractPermissions(
      session.user,
      (session as { accessToken?: string | null }).accessToken ?? null,
    );
    if (!hasPermission(permissions, requiredPermission)) {
      if (process.env.TENON_DEBUG_AUTH) {
        // eslint-disable-next-line no-console
        console.debug('[auth] missing permission', requiredPermission, {
          perms: permissions,
        });
      }
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const accessToken = await getAccessToken();
    return { accessToken };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown token error';
    return NextResponse.json(
      { message: 'Not authenticated', details: msg },
      { status: 401 },
    );
  }
}

type ForwardOptions = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  accessToken: string;
  cache?: RequestCache;
  timeoutMs?: number;
  requestId?: string;
  maxTotalTimeMs?: number;
};

export async function forwardJson(options: ForwardOptions) {
  const { path, method = 'GET', headers = {}, body, accessToken } = options;
  const backendBase = getBackendBaseUrl();
  const start = DEBUG_PERF ? Date.now() : null;
  const requestId = options.requestId ?? generateRequestId();
  const methodUpper = method.toUpperCase();

  const outgoingHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...headers,
  };

  const hasBody =
    body !== undefined && methodUpper !== 'GET' && methodUpper !== 'HEAD';
  const serializedBody =
    body === undefined
      ? undefined
      : typeof body === 'string'
        ? body
        : JSON.stringify(body);

  const callerSetContentType = Object.keys(outgoingHeaders).some(
    (h) => h.toLowerCase() === 'content-type',
  );
  if (hasBody && !callerSetContentType && typeof body !== 'string') {
    outgoingHeaders['Content-Type'] = 'application/json';
  }

  try {
    const upstream = await upstreamRequest({
      url: `${backendBase}${path}`,
      method,
      headers: outgoingHeaders,
      body: serializedBody,
      cache: options.cache ?? 'no-store',
      timeoutMs: options.timeoutMs ?? 15000,
      maxTotalTimeMs: options.maxTotalTimeMs,
      requestId,
    });

    if (DEBUG_PERF && start !== null) {
      const elapsed = Date.now() - start;
      // eslint-disable-next-line no-console
      console.log(
        `[perf:bff] [req ${requestId}] ${method} ${path} -> ${upstream.status} ${elapsed}ms`,
      );
    }

    const parsed = await parseUpstreamBody(upstream);
    const response = NextResponse.json(parsed, {
      status: upstream.status,
      headers: {
        [UPSTREAM_HEADER]: String(upstream.status),
        [REQUEST_ID_HEADER]: requestId,
      },
    });
    const meta = (upstream as unknown as { _tenonMeta?: unknown })
      ._tenonMeta as { attempts?: number; durationMs?: number } | undefined;
    if (meta) {
      const retryCount = Math.max(0, (meta.attempts ?? 1) - 1);
      response.headers.set(
        'Server-Timing',
        `bff;dur=${meta.durationMs ?? 0}, retry;desc="count=${retryCount}"`,
      );
    }
    response.headers.delete('location');
    return response;
  } catch (e) {
    if (DEBUG_PERF && start !== null) {
      // eslint-disable-next-line no-console
      console.log(
        `[perf:bff] [req ${requestId}] ${method} ${path} -> error ${Date.now() - start}ms`,
      );
    }
    throw e;
  }
}

export async function withAuthGuard(
  handler: (accessToken: string) => Promise<NextResponse>,
  options?: { requirePermission?: string },
) {
  const auth = await ensureAccessToken(options?.requirePermission);
  if (auth instanceof NextResponse) return auth;
  return handler(auth.accessToken);
}
