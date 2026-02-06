import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createBackoffTimer } from './backoffTimer';
import type { BackoffControls, BackoffOptions } from './types';

const fallbackDelay =
  (baseMs?: number, capMs?: number) => (attempt: number) => {
    const base = Math.max(1, baseMs ?? 1500);
    const cap = Math.max(capMs ?? 5000, base);
    return Math.min(Math.round(base * 1.4 ** attempt), cap);
  };

export function useBackoffPolling<T>(
  options: BackoffOptions<T>,
): BackoffControls<T> {
  const optionsRef = useRef(options);
  const timerRef = useRef<BackoffControls<T> | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => () => timerRef.current?.cancel(), []);

  const ensureTimer = useCallback(() => {
    if (timerRef.current) return;
    const cfg = optionsRef.current;
    timerRef.current = createBackoffTimer<T>({
      initialDelayMs: cfg.initialDelayMs,
      maxAttempts: cfg.maxAttempts,
      maxDurationMs: cfg.maxDurationMs,
      run: (ctx, attempt, startedAt) =>
        optionsRef.current.run(ctx, attempt, startedAt),
      getDelayMs: (attempt) => {
        const latest = optionsRef.current;
        const custom = latest.getDelayMs;
        if (custom) return custom(attempt);
        return fallbackDelay(latest.baseDelayMs, latest.maxDelayMs)(attempt);
      },
      onTimeout: () => optionsRef.current.onTimeout?.(),
      onMaxAttempts: () => optionsRef.current.onMaxAttempts?.(),
      onError: (err) => optionsRef.current.onError?.(err),
    });
  }, []);

  const controls = useMemo<BackoffControls<T>>(
    () => ({
      start: (context: T) => {
        ensureTimer();
        timerRef.current?.start(context);
      },
      startFrom: (attempt: number, context: T) => {
        ensureTimer();
        timerRef.current?.startFrom(attempt, context);
      },
      cancel: () => timerRef.current?.cancel(),
      isActive: () => timerRef.current?.isActive() ?? false,
    }),
    [ensureTimer],
  );

  return controls;
}
