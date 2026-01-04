import { buildLoginHref } from '@/features/auth/authPaths';
import { loginModeForPath } from '@/lib/auth/access';
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
};

const DEFAULT_BASE_PATH = process.env.NEXT_PUBLIC_TENON_API_BASE_URL ?? '/api';
const NOT_AUTHORIZED_PATH = '/not-authorized';
const BFF_PREFIX = '/api';
let authRedirectInFlight = false;
const retryingRequests = new Set<string>();
const RETRY_DELAY_MS = 200;

function normalizeUrl(basePath: string, path: string): string {
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
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

function buildNotAuthorizedHref(
  returnTo: string,
  mode: 'candidate' | 'recruiter',
): string {
  const params = new URLSearchParams();
  params.set('mode', mode);
  if (returnTo) params.set('returnTo', returnTo);
  const query = params.toString();
  return `${NOT_AUTHORIZED_PATH}${query ? `?${query}` : ''}`;
}

function safeAssign(url: string) {
  const userAgent =
    typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
      ? navigator.userAgent.toLowerCase()
      : '';
  const isJsdom = userAgent.includes('jsdom');
  const assignFn = window.location?.assign as
    | undefined
    | ((nextUrl: string) => void)
    | { mock?: unknown };
  const isMocked =
    assignFn &&
    typeof assignFn === 'function' &&
    Boolean((assignFn as { _isMockFunction?: boolean })._isMockFunction);

  if (isJsdom && !isMocked) return;

  try {
    if (typeof window.location?.assign === 'function') {
      window.location.assign(url);
    }
  } catch {}
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function buildRetryKey(url: string, method: string) {
  return `${method.toUpperCase()}::${url}`;
}

function isBffUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(
      targetUrl,
      isBrowser() && typeof window.location?.origin === 'string'
        ? window.location.origin
        : 'http://localhost',
    );
    return (
      parsed.pathname === BFF_PREFIX ||
      parsed.pathname.startsWith(`${BFF_PREFIX}/`)
    );
  } catch {
    return targetUrl.startsWith(BFF_PREFIX);
  }
}

async function primeSessionForRetry() {
  if (!isBrowser()) return;
  try {
    await fetch('/auth/access-token', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {}

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
}

async function retryBffRequest(
  fetchRequest: () => Promise<Response>,
  retryKey: string,
) {
  retryingRequests.add(retryKey);
  try {
    await primeSessionForRetry();
    return await fetchRequest();
  } finally {
    retryingRequests.delete(retryKey);
  }
}

function shouldRetryBff401(
  status: number,
  targetUrl: string,
  retryKey: string,
  alreadyRetried: boolean,
) {
  return (
    status === 401 &&
    !alreadyRetried &&
    isBrowser() &&
    !retryingRequests.has(retryKey) &&
    isBffUrl(targetUrl)
  );
}

function redirectForAuthError(status: number, returnTo?: string) {
  if (!isBrowser()) return;
  if (status !== 401 && status !== 403) return;
  if (authRedirectInFlight) return;

  const pathname = window.location.pathname || '/';
  const search = window.location.search || '';
  const mode = loginModeForPath(pathname);
  const resolvedReturnTo = returnTo ?? `${pathname}${search}`;
  const target =
    status === 401
      ? buildLoginHref(resolvedReturnTo, mode)
      : buildNotAuthorizedHref(resolvedReturnTo, mode);

  authRedirectInFlight = true;
  safeAssign(target);
}

export function __resetAuthRedirectForTests() {
  authRedirectInFlight = false;
  retryingRequests.clear();
}

async function request<TResponse = unknown>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    cache?: RequestCache;
  } = {},
  clientOptions: ApiClientOptions = {},
): Promise<TResponse> {
  const basePath = clientOptions.basePath ?? DEFAULT_BASE_PATH;
  const targetUrl = normalizeUrl(basePath, path);

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

  const method = options.method ?? 'GET';
  const retryKey = buildRetryKey(targetUrl, method);

  const fetchRequest = () =>
    fetch(targetUrl, {
      method,
      headers,
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      credentials: 'include',
      cache: options.cache,
    });

  let response = await fetchRequest();
  let retried = false;

  if (shouldRetryBff401(response.status, targetUrl, retryKey, retried)) {
    response = await retryBffRequest(fetchRequest, retryKey);
    retried = true;
  }

  if (!response.ok) {
    redirectForAuthError(response.status);
    const errorBody = await parseResponseBody(response);
    const error: ApiErrorShape = {
      message: extractErrorMessage(errorBody, response.status),
      status: response.status,
      details: errorBody,
    };
    throw error;
  }

  if (response.status === 204) return undefined as TResponse;

  return (await parseResponseBody(response)) as TResponse;
}

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
  options?: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    cache?: RequestCache;
  },
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
