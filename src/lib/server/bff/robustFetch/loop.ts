import { REQUEST_ID_HEADER } from '../constants';
import { getFetchDispatcher } from '../dispatcher';
import { attachMeta } from '../retryHelpers';
import {
  applyTimeout,
  attachRouteAbort,
  remainingTimeBudget,
} from '../control';
import type { RobustFetchOptions } from '../robustFetch.types';
import { handleRetryError, handleRetryResponse } from './attemptHandlers';
type LoopOptions = RobustFetchOptions & { headers: Headers };
export async function runWithRetries(opts: LoopOptions): Promise<Response> {
  const {
    url,
    init,
    requestId,
    headers,
    timeoutMs = 15000,
    maxAttempts,
    backoffBaseMs = 150,
    backoffCapMs = 1000,
    maxTotalTimeMs,
  } = opts;

  const retryable = ['GET', 'HEAD'].includes(
    (init.method ?? 'GET').toString().toUpperCase(),
  );
  const attempts = retryable ? (maxAttempts ?? 3) : 1;
  const startTime = Date.now();
  let lastError: unknown;
  headers.set(REQUEST_ID_HEADER, requestId);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const remainingBudget = remainingTimeBudget(maxTotalTimeMs, startTime);
    if (remainingBudget !== null && remainingBudget <= 0)
      throw new Error('Request exceeded max total time');
    const effectiveTimeout =
      remainingBudget !== null
        ? Math.min(timeoutMs, remainingBudget)
        : timeoutMs;
    const { controller, timedOut, clear } = applyTimeout(effectiveTimeout);
    let cleanupRouteAbort: (() => void) | undefined;

    try {
      cleanupRouteAbort = attachRouteAbort(
        init.signal as AbortSignal | undefined,
        controller,
      );
      const dispatcher = getFetchDispatcher();
      const upstream = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
        redirect: 'manual',
        ...(dispatcher ? { dispatcher } : {}),
      });
      clear();

      const retried = await handleRetryResponse({
        retryable,
        attempt,
        attempts,
        upstream,
        backoffBaseMs,
        backoffCapMs,
        remainingBudget,
        maxTotalTimeMs,
        startTime,
        signal: init.signal as AbortSignal | undefined,
      });
      if (retried) continue;

      attachMeta(upstream, attempt, startTime);
      return upstream;
    } catch (err) {
      clear();
      if (timedOut())
        throw new Error(`Request timed out after ${effectiveTimeout}ms`);
      if (init.signal?.aborted && !timedOut())
        throw (init.signal as AbortSignal).reason ?? err;

      const shouldRetry = await handleRetryError({
        retryable,
        attempt,
        attempts,
        backoffBaseMs,
        backoffCapMs,
        remainingBudget,
        maxTotalTimeMs,
        startTime,
        signal: init.signal as AbortSignal | undefined,
      });
      if (!shouldRetry) throw err;
      lastError = err;
      continue;
    } finally {
      cleanupRouteAbort?.();
    }
  }
  throw lastError ?? new Error('Upstream request failed');
}
