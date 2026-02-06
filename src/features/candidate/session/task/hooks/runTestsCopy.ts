import type { RunState } from './runTestsTypes';
import type { ToastTone } from '@/features/shared/notifications/types';

export const statusLabel: Record<RunState, string> = {
  idle: 'Idle',
  starting: 'Starting',
  running: 'Running',
  success: 'Passed',
  failed: 'Failed',
  timeout: 'Timed out',
  error: 'Error',
};

export const statusTone: Record<
  RunState,
  'muted' | 'info' | 'success' | 'warning'
> = {
  idle: 'muted',
  starting: 'info',
  running: 'info',
  success: 'success',
  failed: 'warning',
  timeout: 'warning',
  error: 'warning',
};

export const ctaLabel = (state: RunState) =>
  state === 'starting'
    ? 'Starting…'
    : state === 'running'
      ? 'Running tests…'
      : state === 'success'
        ? 'Re-run tests'
        : state === 'failed' || state === 'timeout' || state === 'error'
          ? 'Retry tests'
          : 'Run tests';

export const fallbackMessage = (state: RunState, msg?: string) =>
  msg?.trim() ||
  (state === 'starting'
    ? 'Preparing test run…'
    : state === 'running'
      ? 'Tests are running. This can take a minute.'
      : state === 'success'
        ? 'Tests passed. You can submit your work.'
        : state === 'failed'
          ? 'Tests failed. Review the logs and try again.'
          : state === 'timeout'
            ? 'Tests timed out. Retry to trigger a new run.'
            : state === 'error'
              ? 'Unable to run tests right now. Please retry.'
              : '');

export const toastCopy = (
  state: RunState,
  message?: string,
): { tone: ToastTone; title: string; description: string } => {
  const tone =
    state === 'success' ? 'success' : state === 'timeout' ? 'warning' : 'error';
  const title =
    state === 'success'
      ? 'Tests passed'
      : state === 'failed'
        ? 'Tests failed'
        : state === 'timeout'
          ? 'Tests timed out'
          : 'Test run issue';

  return {
    tone,
    title,
    description: message ?? fallbackMessage(state, message),
  };
};
