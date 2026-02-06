import { clearCaches } from './cache';
import type { ApiClientOptions, InternalRequestOptions } from './shapes';
import { buildRequestContext } from './requestContext';
import { runRequest } from './runRequest';
import { runRequestWithMeta } from './runRequestWithMeta';

export { clearCaches as __resetHttpClientCache };

export function request<TResponse = unknown>(
  path: string,
  options: InternalRequestOptions = {},
  clientOptions?: ApiClientOptions,
): Promise<TResponse> {
  const startedAt =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  const context = buildRequestContext(path, options, clientOptions);
  return runRequest<TResponse>(
    path,
    options,
    clientOptions,
    context,
    startedAt,
  );
}

export function requestWithMeta<TResponse = unknown>(
  path: string,
  options: InternalRequestOptions = {},
  clientOptions?: ApiClientOptions,
) {
  const startedAt =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  const context = buildRequestContext(path, options, clientOptions);
  return runRequestWithMeta<TResponse>(
    path,
    options,
    clientOptions,
    context,
    startedAt,
  );
}
