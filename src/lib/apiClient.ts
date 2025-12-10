import { getAuthToken } from './auth';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiClientOptions {
  baseUrl?: string;
}

export interface ApiErrorShape {
  message: string;
  status?: number;
  details?: unknown;
}

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function extractErrorMessage(errorBody: unknown, status: number): string {
  if (
    typeof errorBody === 'object' &&
    errorBody !== null
  ) {
    const candidate = errorBody as {
      message?: unknown;
      detail?: unknown;
    };

    if (typeof candidate.message === 'string') {
      return candidate.message;
    }

    if (typeof candidate.detail === 'string') {
      return candidate.detail;
    }
  }

  return `Request failed with status ${status}`;
}

async function request<TResponse = unknown>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
  clientOptions: ApiClientOptions = {}
): Promise<TResponse> {
  const baseUrl = clientOptions.baseUrl ?? DEFAULT_BASE_URL;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  const token =
    typeof window !== 'undefined' ? getAuthToken() : null;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorBody: unknown;

    try {
      errorBody = (await response.json()) as unknown;
    } catch {
      errorBody = undefined;
    }

    const error: ApiErrorShape = {
      message: extractErrorMessage(errorBody, response.status),
      status: response.status,
      details: errorBody,
    };

    throw error;
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const data = (await response.json()) as TResponse;
  return data;
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

export async function login(
  payload: LoginPayload
): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export const apiClient = {
  get: <T = unknown>(path: string) =>
    request<T>(path, { method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  delete: <T = unknown>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};
