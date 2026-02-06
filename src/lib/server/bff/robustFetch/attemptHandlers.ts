import { waitWithAbort } from '../wait';
import { drainUpstream, shouldRetryStatus } from '../retryHelpers';
import { delayForError, delayForResponse } from './retryDelay';

type RetryResponseArgs = {
  retryable: boolean;
  attempt: number;
  attempts: number;
  upstream: Response;
  backoffBaseMs: number;
  backoffCapMs: number;
  remainingBudget: number | null;
  maxTotalTimeMs?: number;
  startTime: number;
  signal?: AbortSignal;
};

export async function handleRetryResponse({
  retryable,
  attempt,
  attempts,
  upstream,
  backoffBaseMs,
  backoffCapMs,
  remainingBudget,
  maxTotalTimeMs,
  startTime,
  signal,
}: RetryResponseArgs): Promise<boolean> {
  if (!retryable || attempt >= attempts || !shouldRetryStatus(upstream.status))
    return false;
  await drainUpstream(upstream);
  const delayMs = delayForResponse({
    status: upstream.status,
    attempt,
    backoffBaseMs,
    backoffCapMs,
    remainingBudget,
    maxTotalTimeMs,
    startTime,
    retryAfterHeader: upstream.headers.get('retry-after'),
  });
  if (delayMs === null) throw new Error('Request exceeded max total time');
  await waitWithAbort(delayMs, signal);
  return true;
}

type RetryErrorArgs = {
  retryable: boolean;
  attempt: number;
  attempts: number;
  backoffBaseMs: number;
  backoffCapMs: number;
  remainingBudget: number | null;
  maxTotalTimeMs?: number;
  startTime: number;
  signal?: AbortSignal;
};

export async function handleRetryError({
  retryable,
  attempt,
  attempts,
  backoffBaseMs,
  backoffCapMs,
  remainingBudget,
  maxTotalTimeMs,
  startTime,
  signal,
}: RetryErrorArgs): Promise<boolean> {
  if (!retryable || attempt >= attempts) return false;
  const delay = delayForError({
    attempt,
    backoffBaseMs,
    backoffCapMs,
    remainingBudget,
    maxTotalTimeMs,
    startTime,
  });
  if (delay === null) throw new Error('Request exceeded max total time');
  await waitWithAbort(delay, signal);
  return true;
}
