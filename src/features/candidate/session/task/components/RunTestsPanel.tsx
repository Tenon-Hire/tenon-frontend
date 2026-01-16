'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { toStatus, toUserMessage } from '@/lib/utils/errors';

type PollResultStatus = 'running' | 'passed' | 'failed' | 'timeout' | 'error';

type PollResult = {
  status: PollResultStatus;
  message?: string;
  passed: number | null;
  failed: number | null;
  total: number | null;
  stdout: string | null;
  stderr: string | null;
  workflowUrl: string | null;
  commitSha: string | null;
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
  storageKey?: string;
  pollIntervalMs?: number;
  maxAttempts?: number;
  maxPollIntervalMs?: number;
  maxDurationMs?: number;
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
  storageKey,
  pollIntervalMs = 1500,
  maxAttempts = 0,
  maxPollIntervalMs = 5000,
  maxDurationMs = 10 * 60 * 1000,
}: RunTestsPanelProps) {
  const [state, setState] = useState<RunState>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<PollResult | null>(null);
  const [expandedOutput, setExpandedOutput] = useState({
    stdout: false,
    stderr: false,
  });
  const runStartRef = useRef<number | null>(null);

  const pollTimerRef = useRef<number | null>(null);
  const pendingPollRef = useRef<{ attempt: number; runId: string } | null>(
    null,
  );

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
      pendingPollRef.current = null;
      runStartRef.current = null;
      setState(next);
      setMessage(fallbackMessage(next, msg));
      if (storageKey) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {}
      }
    },
    [clearTimer, storageKey],
  );

  const resolvePollDelay = useCallback(
    (attempt: number) => {
      const baseInterval = Math.max(1000, pollIntervalMs);
      const cappedMax = Math.max(maxPollIntervalMs, baseInterval);
      const delay = Math.round(baseInterval * Math.pow(1.4, attempt));
      return Math.min(delay, cappedMax);
    },
    [maxPollIntervalMs, pollIntervalMs],
  );

  const pollRun = useCallback(
    async (attempt: number, id: string) => {
      if (maxAttempts && attempt >= maxAttempts) {
        endRun(
          'error',
          'Still running. Open the workflow link to see progress, then check back.',
        );
        return;
      }

      try {
        if (
          maxDurationMs > 0 &&
          runStartRef.current !== null &&
          Date.now() - runStartRef.current > maxDurationMs
        ) {
          endRun(
            'error',
            'This is taking longer than expected. Open the workflow link to track progress, then try polling again.',
          );
          return;
        }
        const res = await onPoll(id);
        setResult(res);
        if (res.status === 'running') {
          setState('running');
          setMessage(fallbackMessage('running', res.message));
          if (typeof document !== 'undefined') {
            if (document.visibilityState === 'hidden') {
              pendingPollRef.current = { attempt: attempt + 1, runId: id };
              return;
            }
          }
          pendingPollRef.current = null;
          clearTimer();
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
      } catch (err) {
        const status = toStatus(err);
        const errMessage =
          status === 401 || status === 403
            ? 'Session expired. Please sign in again.'
            : toUserMessage(
                err,
                'Unable to run tests right now. Please retry.',
              );
        endRun('error', errMessage);
      }
    },
    [clearTimer, endRun, maxAttempts, maxDurationMs, onPoll, resolvePollDelay],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const pending = pendingPollRef.current;
      if (!pending) return;
      pendingPollRef.current = null;
      clearTimer();
      pollTimerRef.current = window.setTimeout(
        () => void pollRun(pending.attempt, pending.runId),
        resolvePollDelay(pending.attempt),
      );
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [clearTimer, pollRun, resolvePollDelay]);

  const startRun = useCallback(async () => {
    if (state === 'starting' || state === 'running') return;

    clearTimer();
    pendingPollRef.current = null;
    setMessage('');
    setResult(null);
    setExpandedOutput({ stdout: false, stderr: false });
    setState('starting');
    runStartRef.current = Date.now();

    try {
      const res = await onStart();
      if (!res?.runId) throw new Error('Missing run id');

      setState('running');
      if (storageKey) {
        try {
          sessionStorage.setItem(storageKey, res.runId);
        } catch {}
      }
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'hidden') {
          pendingPollRef.current = { attempt: 0, runId: res.runId };
          return;
        }
      }
      pendingPollRef.current = null;
      pollTimerRef.current = window.setTimeout(
        () => void pollRun(0, res.runId),
        resolvePollDelay(0),
      );
    } catch (err) {
      const status = toStatus(err);
      const errMessage =
        status === 401 || status === 403
          ? 'Session expired. Please sign in again.'
          : toUserMessage(err, 'Failed to start tests. Please try again.');
      endRun('error', errMessage);
    }
  }, [
    clearTimer,
    endRun,
    onStart,
    pollRun,
    resolvePollDelay,
    state,
    storageKey,
  ]);

  const ctaLabel = useMemo(() => {
    if (state === 'starting') return 'Starting…';
    if (state === 'running') return 'Running tests…';
    if (state === 'success') return 'Re-run tests';
    return 'Run tests';
  }, [state]);

  const disabled = state === 'starting' || state === 'running';
  const displayMessage = message || fallbackMessage(state);
  const statusLabel = useMemo(() => {
    switch (state) {
      case 'starting':
        return 'Starting';
      case 'running':
        return 'Running';
      case 'success':
        return 'Passed';
      case 'failed':
        return 'Failed';
      case 'timeout':
        return 'Timed out';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  }, [state]);
  const statusTone = useMemo(() => {
    switch (state) {
      case 'success':
        return 'success';
      case 'failed':
        return 'warning';
      case 'timeout':
        return 'warning';
      case 'error':
        return 'warning';
      case 'starting':
      case 'running':
        return 'info';
      default:
        return 'muted';
    }
  }, [state]);

  const passed = result?.passed ?? null;
  const failed = result?.failed ?? null;
  const total =
    result?.total ??
    (passed !== null && failed !== null ? passed + failed : null);
  const hasCounts = passed !== null || failed !== null || total !== null;
  const stdout = result?.stdout ?? null;
  const stderr = result?.stderr ?? null;
  const workflowUrl = result?.workflowUrl ?? null;
  const commitSha = result?.commitSha ?? null;
  const shortCommit = commitSha
    ? commitSha.length > 7
      ? commitSha.slice(0, 7)
      : commitSha
    : null;

  const renderOutput = (
    label: string,
    content: string | null,
    expanded: boolean,
    onToggle: () => void,
  ) => {
    const canCopy =
      typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;
    const trimmed = content?.trim() ?? '';
    if (!trimmed) {
      return (
        <div className="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
          {label}: No output captured.
        </div>
      );
    }
    const maxChars = 8000;
    const needsTruncate = trimmed.length > maxChars;
    const displayText =
      !needsTruncate || expanded ? trimmed : `${trimmed.slice(0, maxChars)}…`;
    const handleCopy = async () => {
      if (!navigator?.clipboard?.writeText) return;
      try {
        await navigator.clipboard.writeText(trimmed);
      } catch {}
    };

    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800">
        <div className="flex items-center justify-between text-[11px] text-gray-600">
          <span>{label}</span>
          <div className="flex items-center gap-2">
            {canCopy ? (
              <button
                className="text-blue-600 hover:underline"
                type="button"
                onClick={handleCopy}
              >
                Copy
              </button>
            ) : null}
            {needsTruncate ? (
              <button
                className="text-blue-600 hover:underline"
                type="button"
                onClick={onToggle}
              >
                {expanded ? 'Collapse' : `Show full ${label.toLowerCase()}`}
              </button>
            ) : null}
          </div>
        </div>
        <pre className="mt-1 whitespace-pre-wrap break-words font-mono">
          {displayText}
        </pre>
      </div>
    );
  };

  useEffect(() => {
    if (!storageKey || state !== 'idle') return;
    let storedId: string | null = null;
    try {
      storedId = sessionStorage.getItem(storageKey);
    } catch {}
    if (!storedId) return;
    setState('running');
    setMessage(fallbackMessage('running'));
    runStartRef.current = Date.now();
    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'hidden') {
        pendingPollRef.current = { attempt: 0, runId: storedId };
        return;
      }
    }
    pendingPollRef.current = null;
    clearTimer();
    pollTimerRef.current = window.setTimeout(
      () => void pollRun(0, storedId),
      resolvePollDelay(0),
    );
    return () => {
      clearTimer();
    };
  }, [clearTimer, pollRun, resolvePollDelay, state, storageKey]);

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
        <div className="mt-3 space-y-3 text-sm text-gray-700">
          <div role="status">{displayMessage}</div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={statusLabel} tone={statusTone} />
            {workflowUrl ? (
              <a
                className="text-xs text-blue-600 hover:underline"
                href={workflowUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Workflow run
              </a>
            ) : null}
            {shortCommit ? (
              <div className="text-xs text-gray-600">
                Commit:{' '}
                <span className="font-mono" title={commitSha ?? undefined}>
                  {shortCommit}
                </span>
              </div>
            ) : null}
          </div>
          {hasCounts ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-gray-700">
                <div className="text-[11px] uppercase text-gray-500">
                  Passed
                </div>
                <div className="text-sm font-semibold">{passed ?? '—'}</div>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-gray-700">
                <div className="text-[11px] uppercase text-gray-500">
                  Failed
                </div>
                <div className="text-sm font-semibold">{failed ?? '—'}</div>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-gray-700">
                <div className="text-[11px] uppercase text-gray-500">Total</div>
                <div className="text-sm font-semibold">{total ?? '—'}</div>
              </div>
            </div>
          ) : null}
          {stdout !== null || stderr !== null ? (
            <div className="space-y-2">
              {renderOutput('Stdout', stdout, expandedOutput.stdout, () =>
                setExpandedOutput((prev) => ({
                  ...prev,
                  stdout: !prev.stdout,
                })),
              )}
              {renderOutput('Stderr', stderr, expandedOutput.stderr, () =>
                setExpandedOutput((prev) => ({
                  ...prev,
                  stderr: !prev.stderr,
                })),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type { RunState, PollResult, PollResultStatus };
