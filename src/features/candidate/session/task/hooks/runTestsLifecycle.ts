'use client';

import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

export function useRunTestsVisibility(
  pending: MutableRefObject<{ attempt: number; runId: string } | null>,
  schedule: (attempt: number, runId: string) => void,
) {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      const p = pending.current;
      if (!p) return;
      pending.current = null;
      schedule(p.attempt, p.runId);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [pending, schedule]);
}

export function useRunTestsCleanup(
  clearTimer: () => void,
  pending: MutableRefObject<unknown>,
  locked: MutableRefObject<boolean>,
  startedAt: MutableRefObject<number | null>,
) {
  useEffect(
    () => () => {
      clearTimer();
      pending.current = null;
      locked.current = false;
      startedAt.current = null;
    },
    [clearTimer, locked, pending, startedAt],
  );
}
