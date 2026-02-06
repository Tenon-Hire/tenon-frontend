import { buildDelay, isPromiseLike } from './backoffHelpers';
import type { BackoffOptions, BackoffControls } from './types';

export function createBackoffTimer<T>(
  options: BackoffOptions<T>,
): BackoffControls<T> {
  let timer: number | null = null;
  let active = false;
  let attempt = 0;
  let context: T | null = null;
  let startedAt = 0;
  const delayFor =
    options.getDelayMs ?? buildDelay(options.baseDelayMs, options.maxDelayMs);
  const cancel = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    active = false;
    context = null;
  };
  const schedule = () => {
    if (!active) return;
    const useInitial = attempt === 0 && options.initialDelayMs !== undefined;
    const delay = useInitial
      ? Math.max(0, options.initialDelayMs ?? 0)
      : delayFor(attempt);
    if (
      options.maxDurationMs &&
      attempt > 0 &&
      Date.now() - startedAt + delay >= options.maxDurationMs
    ) {
      options.onTimeout?.();
      return cancel();
    }
    timer = window.setTimeout(() => {
      if (!active) return;
      if (
        options.maxDurationMs &&
        Date.now() - startedAt >= options.maxDurationMs &&
        attempt > 0
      ) {
        options.onTimeout?.();
        return cancel();
      }
      const currentAttempt = attempt;
      const handleResult = (shouldContinue: boolean) => {
        if (!active) return;
        if (!shouldContinue) return cancel();
        attempt = currentAttempt + 1;
        if (
          options.maxAttempts &&
          options.maxAttempts > 0 &&
          attempt >= options.maxAttempts
        ) {
          options.onMaxAttempts?.();
          return cancel();
        }
        schedule();
      };
      const handleError = (err: unknown) => {
        options.onError?.(err);
        cancel();
      };
      try {
        const result = options.run(context as T, currentAttempt, startedAt);
        if (isPromiseLike(result)) {
          result.then(
            (val) => handleResult(Boolean(val)),
            (err) => handleError(err),
          );
        } else {
          handleResult(Boolean(result));
        }
      } catch (err) {
        handleError(err);
      }
    }, delay);
  };

  const startFrom = (nextAttempt: number, ctx: T) => {
    cancel();
    active = true;
    attempt = Math.max(0, nextAttempt);
    context = ctx;
    startedAt = Date.now();
    schedule();
  };

  const start = (ctx: T) => startFrom(0, ctx);
  const isActive = () => active;

  return { start, startFrom, cancel, isActive };
}
