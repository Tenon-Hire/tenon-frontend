import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { persistRunId } from './runTestsStorage';
import type { PollResult, RunState } from './runTestsTypes';

type PendingRef = MutableRefObject<{ attempt: number; runId: string } | null>;

type Params = {
  onStart: () => Promise<{ runId: string }>;
  startPolling: (runId: string, attemptStart?: number) => void;
  clearTimer: () => void;
  setResult: (result: PollResult | null) => void;
  setState: (state: RunState) => void;
  finish: (next: RunState, msg?: string) => void;
  lockedRef: MutableRefObject<boolean>;
  pendingRef: PendingRef;
  startedAtRef: MutableRefObject<number | null>;
  storageKey: string;
};

export function useRunStarter({
  onStart,
  startPolling,
  clearTimer,
  setResult,
  setState,
  finish,
  lockedRef,
  pendingRef,
  startedAtRef,
  storageKey,
}: Params) {
  return useCallback(async () => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    clearTimer();
    setResult(null);
    setState('starting');
    startedAtRef.current = Date.now();
    try {
      const res = await onStart();
      if (!res?.runId) throw new Error('Missing run id');
      setState('running');
      persistRunId(storageKey, res.runId);
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        pendingRef.current = { attempt: 0, runId: res.runId };
        return;
      }
      startPolling(res.runId);
    } catch (err) {
      finish(
        'error',
        err instanceof Error
          ? err.message
          : 'Failed to start tests. Please try again.',
      );
    }
  }, [
    clearTimer,
    finish,
    lockedRef,
    onStart,
    pendingRef,
    setResult,
    setState,
    startPolling,
    startedAtRef,
    storageKey,
  ]);
}
