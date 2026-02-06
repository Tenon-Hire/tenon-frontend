'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotifications } from '@/features/shared/notifications';
import { useRunTestsMachine } from './runTestsMachine';
import { loadStoredRunId } from './runTestsStorage';
import { fallbackMessage, toastCopy } from './runTestsCopy';
import { runTestsDisplayMeta } from './runTestsMeta';
import type { PollResult, RunState, RunTestsArgs } from './runTestsTypes';

export function useRunTests(args: RunTestsArgs) {
  const [state, setState] = useState<RunState>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<PollResult | null>(null);
  const { notify } = useNotifications();

  const onEnd = useCallback(
    (next: RunState, msg?: string) => {
      setState(next);
      setMessage(fallbackMessage(next, msg));
      if (next === 'idle' || next === 'starting' || next === 'running') return;
      const copy = toastCopy(next, msg);
      notify({
        id: 'run-tests',
        tone: copy.tone,
        title: copy.title,
        description: copy.description,
      });
    },
    [notify],
  );

  const { startRun, resumeStored } = useRunTestsMachine(args, {
    setState,
    setResult,
    onEnd,
  });

  useEffect(() => {
    if (!args.storageKey || state !== 'idle') return;
    const stored = loadStoredRunId(args.storageKey);
    if (stored) resumeStored(stored);
  }, [args.storageKey, resumeStored, state]);

  const meta = useMemo(
    () => runTestsDisplayMeta(state, result),
    [result, state],
  );

  const displayMessage =
    state === 'starting' || state === 'running'
      ? fallbackMessage(state)
      : message || fallbackMessage(state);

  return {
    state,
    message: displayMessage,
    result,
    ...meta,
    startRun,
  };
}
