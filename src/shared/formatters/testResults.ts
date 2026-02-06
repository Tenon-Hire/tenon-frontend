import { formatStatusLabel } from './status';

type MinimalTestResults = {
  timeout?: boolean | null;
  conclusion?: string | null;
  runStatus?: string | null;
  failed?: number | null;
  passed?: number | null;
  total?: number | null;
};

export type StatusTone = 'info' | 'success' | 'warning' | 'muted';

export function deriveTestStatus(testResults: MinimalTestResults | null): {
  label: string;
  tone: StatusTone;
} {
  if (!testResults) return { label: 'Not run', tone: 'muted' };
  if (testResults.timeout) return { label: 'Timed out', tone: 'warning' };

  const conclusion = (testResults.conclusion ?? '').toString().toLowerCase();
  const runStatus = (testResults.runStatus ?? '').toString().toLowerCase();

  if (['running', 'in_progress', 'queued'].includes(runStatus))
    return { label: 'Running', tone: 'info' };
  if (['success', 'passed'].includes(conclusion))
    return { label: 'Passed', tone: 'success' };
  if (['failure', 'failed'].includes(conclusion))
    return { label: 'Failed', tone: 'warning' };

  const failed = Number.isFinite(testResults.failed)
    ? (testResults.failed as number)
    : null;
  if (failed && failed > 0) return { label: 'Failed', tone: 'warning' };

  const passed = Number.isFinite(testResults.passed)
    ? (testResults.passed as number)
    : null;
  const total = Number.isFinite(testResults.total)
    ? (testResults.total as number)
    : null;
  if (passed && total && passed === total)
    return { label: 'Passed', tone: 'success' };

  if (runStatus)
    return {
      label: formatStatusLabel(testResults.runStatus) || 'Running',
      tone: 'info',
    };
  if (conclusion)
    return {
      label: formatStatusLabel(testResults.conclusion) || 'Unknown',
      tone: 'muted',
    };

  return { label: 'Not run', tone: 'muted' };
}
