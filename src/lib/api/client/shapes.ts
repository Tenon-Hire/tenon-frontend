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

export type RequestOptions = {
  headers?: Record<string, string>;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  skipCache?: boolean;
  cacheTtlMs?: number;
  dedupeKey?: string;
  disableDedupe?: boolean;
};

export type InternalRequestOptions = RequestOptions & {
  method?: HttpMethod;
  body?: unknown;
};
