import { robustFetch } from './robustFetch';

export type UpstreamRequestOptions = {
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
