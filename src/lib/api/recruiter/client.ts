import { recruiterBffClient, httpRequest } from '../httpClient';
import { HttpError } from '../errors';
import type { HttpMethod, RequestOptions } from '../httpClient/shapes';

export async function recruiterRequest<T>(
  path: string,
  options: RequestOptions & {
    method?: HttpMethod;
    body?: unknown;
  } = {},
) {
  const methodUpper = (options.method ?? 'GET') as HttpMethod;
  const method = methodUpper.toLowerCase() as Lowercase<HttpMethod>;
  const client = recruiterBffClient as unknown as Record<string, unknown>;
  const call =
    typeof client[method] === 'function'
      ? (client[method] as (p: string, o?: unknown) => Promise<unknown>)
      : null;
  const fallback = async () => {
    if (typeof httpRequest === 'function') {
      return httpRequest<unknown>(
        path,
        { ...(options as RequestOptions), method: methodUpper },
        { basePath: '/api', skipAuth: true },
      );
    }

    const targetUrl =
      path.startsWith('http') || path.startsWith('/api')
        ? path
        : `/api${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetch(targetUrl, {
      method: methodUpper,
      headers: options.headers as HeadersInit | undefined,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? (options.body as BodyInit)
            : JSON.stringify(options.body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new HttpError(
        response.status,
        text || 'Request failed',
        response.headers as Headers,
      );
    }

    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  };
  const exec = call ?? fallback;

  try {
    const res = await exec(path, options);

    if (res === null || res === undefined) {
      throw new HttpError(500, 'Request failed');
    }

    if (
      res &&
      typeof res === 'object' &&
      (res as { ok?: unknown }).ok === false
    ) {
      const message =
        (res as { message?: unknown }).message ?? 'Request failed';
      const status =
        (res as { status?: unknown }).status ??
        (res as { error?: { status?: unknown } }).error?.status ??
        500;
      const err = new HttpError(
        typeof status === 'number' ? status : 500,
        typeof message === 'string' ? message : 'Request failed',
      );
      (err as { details?: unknown }).details =
        (res as { details?: unknown }).details ??
        (res as { error?: unknown }).error ??
        null;
      throw err;
    }

    if (
      res &&
      typeof res === 'object' &&
      'data' in (res as Record<string, unknown>)
    ) {
      const data = (res as { data?: unknown }).data as T;
      const requestId =
        (res as { requestId?: unknown }).requestId ??
        (res as { headers?: Headers }).headers?.get?.('x-tenon-request-id') ??
        null;
      return { data, requestId };
    }

    const requestId =
      (res as { requestId?: unknown })?.requestId ??
      (res as { headers?: Headers }).headers?.get?.('x-tenon-request-id') ??
      null;
    return { data: res as T, requestId };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const message =
      err instanceof Error && err.message ? err.message : 'Request failed';
    const httpErr = new HttpError(
      (err as { status?: number })?.status ?? 500,
      message,
      (err as { headers?: Headers }).headers,
    );
    if (err && typeof err === 'object') {
      (httpErr as { details?: unknown }).details = (
        err as {
          details?: unknown;
        }
      ).details;
    }
    throw httpErr;
  }
}

export { recruiterBffClient };
