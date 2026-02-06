import { deriveTestStatus } from '@/features/shared/formatters';
import type { PollResult, RunState } from './runTestsTypes';
import {
  ctaLabel as ctaLabelFor,
  statusLabel as statusLabelMap,
  statusTone as statusToneMap,
} from './runTestsCopy';

const fallbackStatus = (state: RunState) => ({
  label: statusLabelMap[state],
  tone: statusToneMap[state],
});

export function runTestsDisplayMeta(
  state: RunState,
  result: PollResult | null,
): {
  statusLabel: string;
  statusTone: 'info' | 'success' | 'warning' | 'muted';
  ctaLabel: string;
  disabled: boolean;
} {
  const testStatus = result
    ? deriveTestStatus({
        timeout: result.status === 'timeout',
        conclusion: result.status,
        runStatus: result.status,
        failed: result.failed,
        passed: result.passed,
        total: result.total,
      })
    : null;

  const displayStatus = testStatus ?? fallbackStatus(state);

  return {
    statusLabel: displayStatus.label,
    statusTone: displayStatus.tone,
    ctaLabel: ctaLabelFor(state),
    disabled: state === 'starting' || state === 'running',
  };
}
