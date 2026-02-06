import { httpRequest } from '@/lib/api/client';
import type { HttpMethod, RequestOptions } from '@/lib/api/client/shapes';
import { HttpError } from '@/lib/api/errors/errors';

type RecruiterRequestOptions = RequestOptions & {
  method?: HttpMethod;
  body?: unknown;
};

export async function runRecruiterFallback(
  path: string,
  options: RecruiterRequestOptions,
  methodUpper: HttpMethod,
) {
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
}
