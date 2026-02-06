import { useCallback } from 'react';
import { useRunTestsScheduler } from './useRunTestsScheduler';
import { useRunGuards } from './runTestsGuards';
import { loadStoredRunId } from './runTestsStorage';
import { useRunStarter } from './useRunStarter';
import type { PollResult, RunState, RunTestsArgs } from './runTestsTypes';
type Updaters = {
  setState: (s: RunState) => void;
  setResult: (r: PollResult | null) => void;
  onEnd: (next: RunState, msg?: string) => void;
};

export function useRunTestsController(
  args: RunTestsArgs,
  { setState, setResult, onEnd }: Updaters,
) {
  const { onStart, onPoll, storageKey: storageKeyArg } = args;
  const storageKey = storageKeyArg ?? 'run-tests';
  const {
    locked: lockedRef,
    pending: pendingRef,
    startedAt: startedAtRef,
    reset,
  } = useRunGuards();

  const finish = useCallback(
    (next: RunState, msg?: string) => {
      lockedRef.current = false;
      onEnd(next, msg);
    },
    [lockedRef, onEnd],
  );

  const controllers = useRunTestsScheduler({
    onPoll,
    pollIntervalMs: args.pollIntervalMs,
    maxAttempts: args.maxAttempts,
    maxPollIntervalMs: args.maxPollIntervalMs,
    maxDurationMs: args.maxDurationMs,
    finish,
    setResult,
    setState,
    locked: lockedRef,
    pending: pendingRef,
    startedAt: startedAtRef,
  });
  const { startPolling, clearTimer } = controllers;
  const startRun = useRunStarter({
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
  });

  const resumeStored = useCallback(
    (existingId: string) => {
      setState('running');
      lockedRef.current = true;
      startedAtRef.current = Date.now();
      startPolling(existingId);
    },
    [lockedRef, setState, startPolling, startedAtRef],
  );

  const restoreStored = useCallback(
    () => loadStoredRunId(storageKey),
    [storageKey],
  );

  return { startRun, resumeStored, restoreStored, resetGuards: reset };
}
