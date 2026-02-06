import { useCallback, useEffect, useRef } from 'react';

const now = () => Date.now();

type Options = {
  task: () => Promise<unknown> | unknown;
  intervalMs?: number;
  maxDurationMs?: number;
  repeat?: boolean;
  onError?: (err: unknown) => void;
};

type Controls = {
  start: () => void;
  cancel: () => void;
  isActive: () => boolean;
};

export function usePolling({
  task,
  intervalMs = 8000,
  maxDurationMs,
  repeat = true,
  onError,
}: Options): Controls {
  const taskRef = useRef(task);
  const onErrorRef = useRef(onError);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    activeRef.current = false;
  }, []);

  const run = useCallback(
    async function runInner() {
      if (!activeRef.current) return;
      if (
        maxDurationMs &&
        startedAtRef.current !== null &&
        now() - startedAtRef.current >= maxDurationMs
      ) {
        return cancel();
      }
      try {
        await taskRef.current();
      } catch (err) {
        onErrorRef.current?.(err);
        cancel();
        return;
      }
      if (!activeRef.current) return;
      if (!repeat) return cancel();
      timerRef.current = window.setTimeout(runInner, intervalMs);
    },
    [cancel, intervalMs, maxDurationMs, repeat],
  );

  const start = useCallback(() => {
    cancel();
    activeRef.current = true;
    startedAtRef.current = now();
    timerRef.current = window.setTimeout(run, 0);
  }, [cancel, run]);

  useEffect(() => () => cancel(), [cancel]);

  return { start, cancel, isActive: () => activeRef.current };
}
