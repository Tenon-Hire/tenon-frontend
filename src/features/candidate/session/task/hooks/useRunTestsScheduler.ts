import { useCallback, useEffect } from 'react';
import { useBackoffPolling } from '@/shared/polling';
import { useRunTestsCleanup, useRunTestsVisibility } from './runTestsLifecycle';
import { limitMessages, statusMap } from './runTestsMessages';
import type { PollResult, RunState, RunTestsArgs } from './runTestsTypes';

type SchedulerConfig = Pick<
  RunTestsArgs,
  | 'onPoll'
  | 'pollIntervalMs'
  | 'maxPollIntervalMs'
  | 'maxAttempts'
  | 'maxDurationMs'
> & {
  finish: (state: RunState, message?: string) => void;
  setResult: (result: PollResult | null) => void;
  setState: (state: RunState) => void;
  locked: React.MutableRefObject<boolean>;
  pending: React.MutableRefObject<{ attempt: number; runId: string } | null>;
  startedAt: React.MutableRefObject<number | null>;
};

export function useRunTestsScheduler(config: SchedulerConfig) {
  const {
    onPoll,
    finish,
    setResult,
    setState,
    locked: lockedRef,
    pending: pendingRef,
    startedAt: startedAtRef,
  } = config;
  const pollInterval = config.pollIntervalMs ?? 1500;

  const poller = useBackoffPolling<string>({
    initialDelayMs: pollInterval,
    baseDelayMs: pollInterval,
    maxDelayMs: config.maxPollIntervalMs ?? pollInterval,
    maxAttempts: config.maxAttempts,
    maxDurationMs: config.maxDurationMs,
    run: async (runId) => {
      try {
        const res = await onPoll(runId);
        setResult(res);
        if (res.status === 'running') {
          setState('running');
          return true;
        }
        const mapped = statusMap[res.status];
        if (mapped) {
          finish(mapped, res.message);
        } else {
          finish('error', res.message);
        }
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Unable to poll tests right now.';
        finish('error', message);
      }
      return false;
    },
    onTimeout: () => finish('error', limitMessages.duration),
    onMaxAttempts: () => finish('error', limitMessages.attempts),
    onError: (err) => {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to poll tests right now.';
      finish('error', message);
    },
  });

  const startPolling = useCallback(
    (runId: string, attemptStart = 0) => {
      startedAtRef.current = Date.now();
      lockedRef.current = true;
      if (attemptStart > 0) poller.startFrom(attemptStart, runId);
      else poller.start(runId);
    },
    [lockedRef, poller, startedAtRef],
  );

  useRunTestsVisibility(pendingRef, (attempt, runId) =>
    startPolling(runId, attempt),
  );
  useRunTestsCleanup(poller.cancel, pendingRef, lockedRef, startedAtRef);

  useEffect(() => poller.cancel, [poller.cancel]);
  return { startPolling, clearTimer: poller.cancel };
}
