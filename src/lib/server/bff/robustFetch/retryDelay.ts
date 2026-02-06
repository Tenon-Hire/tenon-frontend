import { jitteredBackoffMs, parseRetryAfterMs } from '../backoff';

export const delayForResponse = ({
  status,
  attempt,
  backoffBaseMs,
  backoffCapMs,
  remainingBudget,
  maxTotalTimeMs,
  startTime,
  retryAfterHeader,
}: {
  status: number;
  attempt: number;
  backoffBaseMs: number;
  backoffCapMs: number;
  remainingBudget: number | null;
  maxTotalTimeMs?: number;
  startTime: number;
  retryAfterHeader?: string | null;
}): number | null => {
  let delay = jitteredBackoffMs(attempt, backoffBaseMs, backoffCapMs);
  if (status === 429) {
    const retryAfter = parseRetryAfterMs(
      retryAfterHeader ?? null,
      Date.now(),
      2000,
    );
    if (retryAfter !== null && retryAfter > 0) delay = retryAfter;
  }
  return budgetDelay(delay, remainingBudget, maxTotalTimeMs, startTime);
};

export const delayForError = ({
  attempt,
  backoffBaseMs,
  backoffCapMs,
  remainingBudget,
  maxTotalTimeMs,
  startTime,
}: {
  attempt: number;
  backoffBaseMs: number;
  backoffCapMs: number;
  remainingBudget: number | null;
  maxTotalTimeMs?: number;
  startTime: number;
}): number | null => {
  const delay = jitteredBackoffMs(attempt, backoffBaseMs, backoffCapMs);
  return budgetDelay(delay, remainingBudget, maxTotalTimeMs, startTime);
};

const budgetDelay = (
  delay: number,
  remainingBudget: number | null,
  maxTotalTimeMs: number | undefined,
  startTime: number,
) => {
  if (remainingBudget === null) return delay;
  const budgeted = Math.min(
    delay,
    Math.max(0, maxTotalTimeMs! - (Date.now() - startTime)),
  );
  return budgeted <= 0 ? null : budgeted;
};
