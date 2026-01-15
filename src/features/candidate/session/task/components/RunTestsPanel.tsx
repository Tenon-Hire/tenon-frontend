'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';

type PollResultStatus = 'running' | 'passed' | 'failed' | 'timeout' | 'error';

type PollResult = {
  status: PollResultStatus;
  message?: string;
};

type RunState =
  | 'idle'
  | 'starting'
  | 'running'
  | 'success'
  | 'failed'
  | 'timeout'
  | 'error';

type RunTestsPanelProps = {
  onStart: () => Promise<{ runId: string }>;
  onPoll: (runId: string) => Promise<PollResult>;
  pollIntervalMs?: number;
  maxAttempts?: number;
  maxPollIntervalMs?: number;
};

function fallbackMessage(state: RunState, provided?: string) {
  if (provided && provided.trim()) return provided;

  switch (state) {
    case 'starting':
      return 'Preparing test run…';
    case 'running':
      return 'Tests are running. This can take a minute.';
    case 'success':
      return 'Tests passed. You can submit your work.';
    case 'failed':
      return 'Tests failed. Review the logs and try again.';
    case 'timeout':
      return 'Tests timed out. Retry to trigger a new run.';
    case 'error':
      return 'Unable to run tests right now. Please retry.';
    default:
      return '';
  }
}

export function RunTestsPanel({
  onStart,
  onPoll,
  pollIntervalMs = 1500,
  maxAttempts = 6,
  maxPollIntervalMs = 5000,
}: RunTestsPanelProps) {
  const [state, setState] = useState<RunState>('idle');
  const [message, setMessage] = useState('');

  const pollTimerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const endRun = useCallback(
    (next: RunState, msg?: string) => {
      clearTimer();
      setState(next);
      setMessage(fallbackMessage(next, msg));
    },
    [clearTimer],
  );

  const resolvePollDelay = useCallback(
    (attempt: number) => {
      const baseInterval = Math.max(1000, pollIntervalMs);
      const cappedMax = Math.max(maxPollIntervalMs, baseInterval);
      const delay = Math.round(baseInterval * Math.pow(1.6, attempt));
      return Math.min(delay, cappedMax);
    },
    [maxPollIntervalMs, pollIntervalMs],
  );

  const pollRun = useCallback(
    async (attempt: number, id: string) => {
      if (maxAttempts && attempt >= maxAttempts) {
        endRun('timeout');
        return;
      }

      try {
        const res = await onPoll(id);
        if (res.status === 'running') {
          pollTimerRef.current = window.setTimeout(
            () => void pollRun(attempt + 1, id),
            resolvePollDelay(attempt + 1),
          );
          return;
        }

        if (res.status === 'passed') {
          endRun('success', res.message);
          return;
        }
        if (res.status === 'failed') {
          endRun('failed', res.message);
          return;
        }
        if (res.status === 'timeout') {
          endRun('timeout', res.message);
          return;
        }

        endRun('error', res.message);
      } catch {
        endRun('error');
      }
    },
    [endRun, maxAttempts, onPoll, resolvePollDelay],
  );

  const startRun = useCallback(async () => {
    if (state === 'starting' || state === 'running') return;

    clearTimer();
    setMessage('');
    setState('starting');

    try {
      const res = await onStart();
      if (!res?.runId) throw new Error('Missing run id');

      setState('running');
      pollTimerRef.current = window.setTimeout(
        () => void pollRun(0, res.runId),
        resolvePollDelay(0),
      );
    } catch {
      endRun('error', 'Failed to start tests. Please try again.');
    }
  }, [clearTimer, endRun, onStart, pollRun, resolvePollDelay, state]);

  const ctaLabel = useMemo(() => {
    if (state === 'starting') return 'Starting…';
    if (state === 'running') return 'Running tests…';
    if (state === 'success') return 'Re-run tests';
    return 'Run tests';
  }, [state]);

  const disabled = state === 'starting' || state === 'running';
  const displayMessage = message || fallbackMessage(state);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Run tests (Actions)
          </div>
          <div className="text-xs text-gray-600">
            Prevent duplicate runs; polls until complete.
          </div>
        </div>

        <Button onClick={startRun} disabled={disabled}>
          {ctaLabel}
        </Button>
      </div>

      {state !== 'idle' ? (
        <div className="mt-3 text-sm text-gray-700" role="status">
          {displayMessage}
        </div>
      ) : null}
    </div>
  );
}

export type { RunState, PollResult, PollResultStatus };
