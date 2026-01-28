import { getAuthToken } from '../auth';
import type { Result } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiClientOptions {
  basePath?: string;
  authToken?: string | null;
  skipAuth?: boolean;
}

export interface ApiErrorShape {
  message: string;
  status?: number;
  details?: unknown;
}

type RequestOptions = {
  headers?: Record<string, string>;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  skipCache?: boolean;
  cacheTtlMs?: number;
  dedupeKey?: string;
  disableDedupe?: boolean;
};

const DEFAULT_BASE_PATH =
  process.env.NEXT_PUBLIC_TENON_API_BASE_URL ?? '/api/backend';
const BFF_CLIENT_OPTIONS: ApiClientOptions = {
  basePath: '/api',
  skipAuth: true,
};

const DEFAULT_CACHE_TTL_MS = 8000;
const MAX_CACHE_TTL_MS = 15000;
const MAX_CACHE_ENTRIES = 150;

const DEBUG_PERF =
  (process.env.NEXT_PUBLIC_TENON_DEBUG_PERF ?? '').toLowerCase() === '1' ||
  (process.env.NEXT_PUBLIC_TENON_DEBUG_PERF ?? '').toLowerCase() === 'true';

type CacheEntry = { data: unknown; expiresAt: number };
const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();
export function __resetHttpClientCache() {
  responseCache.clear();
  inflightRequests.clear();
}

function nowMs() {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
  ) {
    return performance.now();
  }
  return Date.now();
}

const SENSITIVE_KEYS = ['token', 'authorization', 'secret', 'code', 'password'];

function sanitizePath(url: string): string {
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

function normalizeForCache(targetUrl: string): string {
  try {
    const parsed = new URL(targetUrl, 'http://localhost');
    parsed.hash = '';
    const params = new URLSearchParams(parsed.search);
    params.sort();
    const qs = params.toString();
    return `${parsed.origin}${parsed.pathname}${qs ? `?${qs}` : ''}`;
  } catch {
    return targetUrl;
  }
}

function buildCacheKey(
  method: HttpMethod,
  targetUrl: string,
  hasAuthToken: boolean,
  dedupeKey?: string,
) {
  const normalized = normalizeForCache(targetUrl);
  const suffix = dedupeKey ? `::${dedupeKey}` : '';
  return `${method}::${normalized}::auth:${hasAuthToken ? '1' : '0'}${suffix}`;
}

function getCachedResponse<T>(key: string): T | null {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt > Date.now()) return cached.data as T;
  responseCache.delete(key);
  return null;
}

function setCachedResponse(key: string, data: unknown, ttlMs: number): void {
  const expiresAt = Date.now() + Math.min(Math.max(ttlMs, 0), MAX_CACHE_TTL_MS);
  responseCache.set(key, { data, expiresAt });
  if (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value as string | undefined;
    if (oldestKey) responseCache.delete(oldestKey);
  }
}

type PerfStatus = number | 'error' | 'network' | 'cache';

function logRequestPerf(
  method: HttpMethod,
  targetUrl: string,
  status: PerfStatus,
  startedAt: number | null,
  cacheMode?: string,
) {
  if (!DEBUG_PERF || startedAt === null) return;
  const durationMs = Math.round(nowMs() - startedAt);
  const safeUrl = sanitizePath(targetUrl);
  const payload: Record<string, unknown> = {
    status,
    durationMs,
  };
  if (cacheMode) payload.cache = cacheMode;
  // eslint-disable-next-line no-console
  console.info(`[api][perf] ${method} ${safeUrl}`, payload);
}

function normalizeUrl(basePath: string, path: string): string {
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export function isSameOriginRequest(url: string): boolean {
  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      const base = window.location.origin;
      return new URL(url, base).origin === base;
    } catch {
      return url.startsWith('/') && !url.startsWith('//');
    }
  }

  return url.startsWith('/') && !url.startsWith('//');
}

function extractErrorMessage(errorBody: unknown, status: number): string {
  if (typeof errorBody === 'object' && errorBody !== null) {
    const candidate = errorBody as { message?: unknown; detail?: unknown };

    if (typeof candidate.message === 'string') return candidate.message;

    if (typeof candidate.detail === 'string') return candidate.detail;

    if (Array.isArray(candidate.detail) && candidate.detail.length > 0) {
      const first = candidate.detail[0] as { msg?: unknown };
      if (first && typeof first.msg === 'string') return first.msg;
    }
  }

  return `Request failed with status ${status}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return (await response.json()) as unknown;
    } catch {
      return undefined;
    }
  }

  try {
    return await response.text();
  } catch {
    return undefined;
  }
}

function isApiClientOptions(value: unknown): value is ApiClientOptions {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return 'basePath' in v || 'authToken' in v || 'skipAuth' in v;
}

type InternalRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
} & RequestOptions;

async function request<TResponse = unknown>(
  path: string,
  options: InternalRequestOptions = {},
  clientOptions: ApiClientOptions = {},
): Promise<TResponse> {
  const basePath = clientOptions.basePath ?? DEFAULT_BASE_PATH;
  const targetUrl = normalizeUrl(basePath, path);
  const sameOrigin = isSameOriginRequest(targetUrl);
  const startedAt = DEBUG_PERF ? nowMs() : null;
  let status: PerfStatus = 'error';

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (options.body !== undefined && !isFormData) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  const hasAuthToken = Object.prototype.hasOwnProperty.call(
    clientOptions,
    'authToken',
  );

  const token = hasAuthToken
    ? clientOptions.authToken
    : typeof window !== 'undefined'
      ? getAuthToken()
      : null;

  if (!clientOptions.skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cache =
    options.cache ?? (basePath.startsWith('/api') ? 'no-store' : undefined);

  const credentials =
    options.credentials ?? (sameOrigin ? ('include' as const) : 'omit');

  const method = (options.method ?? 'GET') as HttpMethod;
  const isGet = method === 'GET';
  const skipCache = options.skipCache === true;
  const dedupeEnabled = isGet && options.disableDedupe !== true && !skipCache;
  const cacheKey =
    dedupeEnabled && isGet
      ? buildCacheKey(
          method,
          targetUrl,
          Boolean(token ?? clientOptions.authToken),
          options.dedupeKey,
        )
      : null;
  const cacheTtlMs =
    typeof options.cacheTtlMs === 'number'
      ? Math.min(Math.max(options.cacheTtlMs, 0), MAX_CACHE_TTL_MS)
      : DEFAULT_CACHE_TTL_MS;

  if (cacheKey && !skipCache) {
    const cached = getCachedResponse<TResponse>(cacheKey);
    if (cached !== null) {
      logRequestPerf(method, targetUrl, 'cache', startedAt, 'memory');
      return Promise.resolve(cached);
    }
    const inflight = inflightRequests.get(cacheKey);
    if (inflight) {
      logRequestPerf(method, targetUrl, 'cache', startedAt, 'dedupe');
      return inflight as Promise<TResponse>;
    }
  }

  try {
    const execution = (async () => {
      const response = await fetch(targetUrl, {
        method,
        headers,
        body:
          options.body === undefined
            ? undefined
            : isFormData
              ? (options.body as FormData)
              : JSON.stringify(options.body),
        credentials,
        cache,
        signal: options.signal,
      });
      status = response.status;

      if (!response.ok) {
        const errorBody = await parseResponseBody(response);
        const error: ApiErrorShape = {
          message: extractErrorMessage(errorBody, response.status),
          status: response.status,
          details: errorBody,
        };
        throw error;
      }

      if (response.status === 204) return undefined as TResponse;

      const parsed = (await parseResponseBody(response)) as TResponse;
      if (cacheKey && dedupeEnabled && !skipCache && cacheTtlMs > 0) {
        setCachedResponse(cacheKey, parsed, cacheTtlMs);
      }
      return parsed;
    })();

    if (cacheKey && dedupeEnabled) {
      inflightRequests.set(cacheKey, execution);
    }

    return await execution;
  } catch (err) {
    status = (err as { status?: number })?.status ?? 'network';
    throw err;
  } finally {
    if (cacheKey && dedupeEnabled) {
      inflightRequests.delete(cacheKey);
    }
    logRequestPerf(
      method,
      targetUrl,
      status,
      startedAt,
      cache ?? (cacheKey ? 'memory' : undefined),
    );
  }
}

function buildScopedClient(defaultOptions: ApiClientOptions) {
  return {
    get: async <T = unknown>(path: string, requestOptions?: RequestOptions) =>
      request<T>(
        path,
        { method: 'GET', ...(requestOptions ?? {}) },
        defaultOptions,
      ),

    post: async <T = unknown>(
      path: string,
      body?: unknown,
      requestOptions?: RequestOptions,
    ) =>
      request<T>(
        path,
        { method: 'POST', body, ...(requestOptions ?? {}) },
        defaultOptions,
      ),

    put: async <T = unknown>(
      path: string,
      body?: unknown,
      requestOptions?: RequestOptions,
    ) =>
      request<T>(
        path,
        { method: 'PUT', body, ...(requestOptions ?? {}) },
        defaultOptions,
      ),

    patch: async <T = unknown>(
      path: string,
      body?: unknown,
      requestOptions?: RequestOptions,
    ) =>
      request<T>(
        path,
        { method: 'PATCH', body, ...(requestOptions ?? {}) },
        defaultOptions,
      ),

    delete: async <T = unknown>(
      path: string,
      requestOptions?: RequestOptions,
    ) =>
      request<T>(
        path,
        { method: 'DELETE', ...(requestOptions ?? {}) },
        defaultOptions,
      ),
  };
}

export const recruiterBffClient = buildScopedClient(BFF_CLIENT_OPTIONS);

export interface LoginResponseUser {
  id: string | number;
  email: string;
  name?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer' | string;
  user?: LoginResponseUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function safeRequest<T>(
  path: string,
  options?: InternalRequestOptions,
  clientOptions?: ApiClientOptions,
): Promise<Result<T>> {
  try {
    const data = await request<T>(path, options, clientOptions);
    return { data, error: null };
  } catch (err) {
    const error =
      err instanceof Error
        ? err
        : new Error(typeof err === 'string' ? err : 'Request failed');
    return { data: null, error };
  }
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export const apiClient = {
  get: async <T = unknown>(
    path: string,
    arg2?: ApiClientOptions | RequestOptions,
    arg3?: ApiClientOptions,
  ) => {
    const requestOptions: RequestOptions | undefined = isApiClientOptions(arg2)
      ? undefined
      : (arg2 as RequestOptions | undefined);

    const clientOptions: ApiClientOptions | undefined = isApiClientOptions(arg2)
      ? (arg2 as ApiClientOptions)
      : arg3;

    return request<T>(
      path,
      { method: 'GET', ...(requestOptions ?? {}) },
      clientOptions,
    );
  },

  post: async <T = unknown>(
    path: string,
    body?: unknown,
    arg3?: ApiClientOptions | RequestOptions,
    arg4?: ApiClientOptions,
  ) => {
    const requestOptions: RequestOptions | undefined = isApiClientOptions(arg3)
      ? undefined
      : (arg3 as RequestOptions | undefined);

    const clientOptions: ApiClientOptions | undefined = isApiClientOptions(arg3)
      ? (arg3 as ApiClientOptions)
      : arg4;

    return request<T>(
      path,
      { method: 'POST', body, ...(requestOptions ?? {}) },
      clientOptions,
    );
  },

  put: async <T = unknown>(
    path: string,
    body?: unknown,
    arg3?: ApiClientOptions | RequestOptions,
    arg4?: ApiClientOptions,
  ) => {
    const requestOptions: RequestOptions | undefined = isApiClientOptions(arg3)
      ? undefined
      : (arg3 as RequestOptions | undefined);

    const clientOptions: ApiClientOptions | undefined = isApiClientOptions(arg3)
      ? (arg3 as ApiClientOptions)
      : arg4;

    return request<T>(
      path,
      { method: 'PUT', body, ...(requestOptions ?? {}) },
      clientOptions,
    );
  },

  patch: async <T = unknown>(
    path: string,
    body?: unknown,
    arg3?: ApiClientOptions | RequestOptions,
    arg4?: ApiClientOptions,
  ) => {
    const requestOptions: RequestOptions | undefined = isApiClientOptions(arg3)
      ? undefined
      : (arg3 as RequestOptions | undefined);

    const clientOptions: ApiClientOptions | undefined = isApiClientOptions(arg3)
      ? (arg3 as ApiClientOptions)
      : arg4;

    return request<T>(
      path,
      { method: 'PATCH', body, ...(requestOptions ?? {}) },
      clientOptions,
    );
  },

  delete: async <T = unknown>(
    path: string,
    arg2?: ApiClientOptions | RequestOptions,
    arg3?: ApiClientOptions,
  ) => {
    const requestOptions: RequestOptions | undefined = isApiClientOptions(arg2)
      ? undefined
      : (arg2 as RequestOptions | undefined);

    const clientOptions: ApiClientOptions | undefined = isApiClientOptions(arg2)
      ? (arg2 as ApiClientOptions)
      : arg3;

    return request<T>(
      path,
      { method: 'DELETE', ...(requestOptions ?? {}) },
      clientOptions,
    );
  },
};
