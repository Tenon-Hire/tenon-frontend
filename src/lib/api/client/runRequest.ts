import {
  deleteInflight,
  getCachedResponse,
  getInflight,
  setCachedResponse,
  setInflight,
} from './cache';
import { logRequestPerf } from './perf';
import { requestCore } from './requestCore';
import type { ApiClientOptions, InternalRequestOptions } from './shapes';
import type { RequestContext } from './requestContext';

const isBrowser = typeof window !== 'undefined';

export function runRequest<TResponse>(
  path: string,
  options: InternalRequestOptions,
  clientOptions: ApiClientOptions | undefined,
  ctx: RequestContext,
  startedAt: number,
) {
  let status: number | 'error' | 'network' | 'cache' = 'error';

  const cached = ctx.cacheKey
    ? getCachedResponse<TResponse>(ctx.cacheKey)
    : null;
  if (cached !== null) {
    status = 'cache';
    logRequestPerf(ctx.method, path, status, startedAt, 'memory');
    return Promise.resolve(cached);
  }

  const inflight =
    ctx.dedupeEnabled && ctx.dedupeKey
      ? getInflight<TResponse>(ctx.dedupeKey)
      : null;
  if (inflight) {
    status = 'cache';
    logRequestPerf(ctx.method, path, status, startedAt, 'dedupe');
    return inflight;
  }

  const corePromise = requestCore<TResponse>(
    path,
    { ...options, headers: ctx.headers },
    clientOptions,
  ).then(({ data, status: respStatus }) => {
    status = respStatus;
    if (ctx.cacheKey && !ctx.skipCache && ctx.cacheTtlMs > 0 && isBrowser) {
      setCachedResponse(ctx.cacheKey, data, ctx.cacheTtlMs);
    }
    logRequestPerf(
      ctx.method,
      path,
      status,
      startedAt,
      options.cache ?? undefined,
    );
    return data;
  });

  if (ctx.dedupeKey && ctx.dedupeEnabled)
    setInflight(ctx.dedupeKey, corePromise);

  corePromise.catch((err) => {
    status = (err as { status?: number })?.status ?? 'network';
    if (ctx.dedupeKey && ctx.dedupeEnabled) deleteInflight(ctx.dedupeKey);
    logRequestPerf(
      ctx.method,
      path,
      status,
      startedAt,
      options.cache ?? undefined,
    );
  });

  return corePromise.finally(() => {
    if (ctx.dedupeKey && ctx.dedupeEnabled) deleteInflight(ctx.dedupeKey);
  });
}
