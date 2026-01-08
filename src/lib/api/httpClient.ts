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
};

const DEFAULT_BASE_PATH =
  process.env.NEXT_PUBLIC_TENON_API_BASE_URL ?? '/api/backend';
const BFF_CLIENT_OPTIONS: ApiClientOptions = {
  basePath: '/api',
  skipAuth: true,
};

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

  const response = await fetch(targetUrl, {
    method: options.method ?? 'GET',
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

  return (await parseResponseBody(response)) as TResponse;
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
