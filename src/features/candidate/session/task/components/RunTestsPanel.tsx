'use client';

import { useRunTests } from '../hooks/useRunTests';
import type { PollResult } from '../hooks/runTestsTypes';
import { RunTestsPanelHeader } from './RunTestsPanelHeader';
import { RunTestsPanelBody } from './RunTestsPanelBody';

type Props = {
  onStart: () => Promise<{ runId: string }>;
  onPoll: (runId: string) => Promise<PollResult>;
  storageKey?: string;
  pollIntervalMs?: number;
  maxAttempts?: number;
  maxPollIntervalMs?: number;
  maxDurationMs?: number;
};

export function RunTestsPanel(props: Props) {
  const {
    message,
    result,
    statusLabel,
    statusTone,
    ctaLabel,
    disabled,
    startRun,
  } = useRunTests(props);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <RunTestsPanelHeader
        onClick={startRun}
        disabled={disabled}
        label={ctaLabel}
      />
      <RunTestsPanelBody
        message={message}
        statusLabel={statusLabel}
        statusTone={statusTone}
        result={result}
      />
    </div>
  );
}
