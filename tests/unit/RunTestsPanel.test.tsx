import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunTestsPanel } from '@/features/candidate/session/task/components/RunTestsPanel';

const realConsoleError = console.error;
const originalNavigator = global.navigator;
const notifyMock = jest.fn();
const baseResult = {
  passed: null,
  failed: null,
  total: null,
  stdout: null,
  stderr: null,
  workflowUrl: null,
  commitSha: null,
};

const getTestsButton = () =>
  screen.getByRole('button', { name: /^(run|re-run|retry|running)\s+tests/i });

jest.mock('@/features/shared/notifications', () => ({
  useNotifications: () => ({ notify: notifyMock }),
}));

jest.mock('@/lib/utils/errors', () => {
  const actual = jest.requireActual('@/lib/utils/errors');
  return {
    ...actual,
    normalizeApiError: jest.fn((err: unknown, fallback?: string) => ({
      message:
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : (fallback ?? 'normalized'),
    })),
  };
});

let timersAreFake = false;
const useFakeTimers = () => {
  timersAreFake = true;
  jest.useFakeTimers();
};
const restoreRealTimers = () => {
  jest.useRealTimers();
  timersAreFake = false;
};

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((message, ...args) => {
    if (
      typeof message === 'string' &&
      (message.includes('not wrapped in act') ||
        message.includes('without await'))
    ) {
      return;
    }
    realConsoleError(message, ...args);
  });
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('RunTestsPanel', () => {
  afterEach(() => {
    if (timersAreFake) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    act(() => {});
    restoreRealTimers();
    notifyMock.mockReset();
    try {
      sessionStorage.clear();
    } catch {}
    // restore navigator after clipboard overrides
    global.navigator = originalNavigator;
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
  });

  it('starts a run and polls until success', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'run-1' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ ...baseResult, status: 'running' as const })
      .mockResolvedValueOnce({
        ...baseResult,
        status: 'passed' as const,
        message: 'Checks green',
        passed: 4,
        failed: 0,
        total: 4,
        stdout: 'ok',
        stderr: '',
        workflowUrl: 'https://github.com/acme/repo/actions/runs/1',
        commitSha: 'abc123def',
      });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Preparing test run/i)).toBeInTheDocument();

    expect(
      await screen.findByRole('button', { name: /Running tests/i }),
    ).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(onPoll).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1600);
      await Promise.resolve();
    });
    expect(onPoll).toHaveBeenCalledTimes(2);

    expect(await screen.findByText(/Checks green/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Passed/i)).length).toBeGreaterThan(0);
    expect(
      await screen.findByRole('link', { name: /workflow run/i }),
    ).toHaveAttribute('href', 'https://github.com/acme/repo/actions/runs/1');
    expect(await screen.findByText(/Commit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /re-run tests/i })).toBeEnabled();
  });

  it('stops polling once a terminal status is reached', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'stop-loop' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ ...baseResult, status: 'running' as const })
      .mockResolvedValueOnce({ ...baseResult, status: 'passed' as const });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={500} />,
    );

    await user.click(getTestsButton());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate runs while running and allows retry after failure', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'r-2' });
    const onPoll = jest.fn().mockResolvedValueOnce({
      ...baseResult,
      status: 'failed' as const,
      message: 'Red',
      failed: 2,
      total: 2,
    });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    const cta = getTestsButton();
    await user.click(cta);
    await user.click(cta);

    expect(onStart).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Red/)).toBeInTheDocument();

    await user.click(getTestsButton());
    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it('ignores rapid double clicks before state updates', async () => {
    useFakeTimers();

    const onStart = jest.fn().mockResolvedValue({ runId: 'fast' });
    const onPoll = jest
      .fn()
      .mockResolvedValue({ ...baseResult, status: 'running' as const });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    const cta = getTestsButton();
    act(() => {
      cta.click();
      cta.click();
    });

    await act(async () => Promise.resolve());

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('times out after max polling attempts when runs never finish', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'stuck' });
    const onPoll = jest
      .fn()
      .mockResolvedValue({ ...baseResult, status: 'running' as const });

    render(
      <RunTestsPanel
        onStart={onStart}
        onPoll={onPoll}
        pollIntervalMs={1000}
        maxAttempts={2}
      />,
    );

    await user.click(getTestsButton());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(1600);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(2600);
      await Promise.resolve();
    });
    expect(
      await screen.findByText(/Still running\. Open the workflow link/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Tests timed out/i)).not.toBeInTheDocument();
  });

  it('uses default messages for passed, timeout, and error statuses', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'run-defaults' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ ...baseResult, status: 'passed' as const })
      .mockResolvedValueOnce({ ...baseResult, status: 'timeout' as const })
      .mockResolvedValueOnce({ ...baseResult, status: 'error' as const });

    render(
      <RunTestsPanel
        onStart={onStart}
        onPoll={onPoll}
        pollIntervalMs={1000}
        maxAttempts={3}
      />,
    );

    await user.click(getTestsButton());
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(
      await screen.findByText(/Tests passed\. You can submit your work\./i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /re-run tests/i }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(await screen.findByText(/Tests timed out/i)).toBeInTheDocument();

    await user.click(getTestsButton());
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(
      await screen.findByText(/Unable to run tests right now/i),
    ).toBeInTheDocument();
  });

  it('surfaces errors from start and poll failures', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockRejectedValue(new Error('fail to start'));
    const onPoll = jest.fn().mockRejectedValue(new Error('poll failed'));

    const { rerender } = render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());
    await act(async () => Promise.resolve());

    expect(await screen.findByText(/fail to start/i)).toBeInTheDocument();

    // Retry and hit polling error
    const nextStart = jest.fn().mockResolvedValue({ runId: 'r-err' });
    rerender(
      <RunTestsPanel
        onStart={nextStart}
        onPoll={onPoll}
        pollIntervalMs={1000}
      />,
    );

    await user.click(getTestsButton());
    await act(async () => Promise.resolve());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(nextStart).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/poll failed/i)).toBeInTheDocument();
  });

  it('clears start errors after a successful run start', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail to start'))
      .mockResolvedValueOnce({ runId: 'r-ok' });
    const onPoll = jest
      .fn()
      .mockResolvedValue({ ...baseResult, status: 'running' as const });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());
    await act(async () => Promise.resolve());

    expect(await screen.findByText(/fail to start/i)).toBeInTheDocument();

    await user.click(getTestsButton());
    expect(onStart).toHaveBeenCalledTimes(2);

    expect(await screen.findByText(/Tests are running/i)).toBeInTheDocument();
    expect(screen.queryByText(/fail to start/i)).not.toBeInTheDocument();
  });

  it('clears polling timers on unmount', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'run-unmount' });
    const onPoll = jest
      .fn()
      .mockResolvedValue({ ...baseResult, status: 'running' as const });

    const { unmount } = render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());
    await act(async () => Promise.resolve());

    act(() => {
      unmount();
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(0);
  });

  it('truncates stdout and expands on demand', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const longStdout = 'a'.repeat(9001);

    const onStart = jest.fn().mockResolvedValue({ runId: 'run-output' });
    const onPoll = jest.fn().mockResolvedValueOnce({
      ...baseResult,
      status: 'failed' as const,
      stdout: longStdout,
      stderr: 'err',
      failed: 1,
      total: 1,
    });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(screen.queryByText(longStdout)).not.toBeInTheDocument();
    expect(
      await screen.findAllByRole('button', { name: /copy/i }),
    ).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /show full stdout/i }));
    expect(await screen.findByText(longStdout)).toBeInTheDocument();
  });

  it('restores in-flight run from sessionStorage when present', async () => {
    useFakeTimers();
    sessionStorage.setItem('stored-run', 'run-resume');
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ ...baseResult, status: 'running' as const })
      .mockResolvedValueOnce({ ...baseResult, status: 'passed' as const });

    render(
      <RunTestsPanel
        onStart={jest.fn()}
        onPoll={onPoll}
        storageKey="stored-run"
        pollIntervalMs={100}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(1200);
      await Promise.resolve();
      jest.advanceTimersByTime(1200);
      await Promise.resolve();
    });
    expect(
      screen.getByText(/Tests are running\. This can take a minute\./i),
    ).toBeInTheDocument();
  });

  it('resumes pending poll when tab becomes visible', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    const onStart = jest.fn().mockResolvedValue({ runId: 'pending-1' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ ...baseResult, status: 'running' as const })
      .mockResolvedValueOnce({ ...baseResult, status: 'passed' as const });

    render(
      <RunTestsPanel
        onStart={onStart}
        onPoll={onPoll}
        pollIntervalMs={50}
        maxPollIntervalMs={50}
      />,
    );

    await user.click(screen.getByRole('button'));
    expect(onPoll).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {
      jest.advanceTimersByTime(1100);
      await Promise.resolve();
    });
    expect(onPoll).toHaveBeenCalledWith('pending-1');
  });

  it('handles clipboard failures and missing clipboard gracefully', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onStart = jest.fn().mockResolvedValue({ runId: 'copy-run' });
    const onPoll = jest.fn().mockResolvedValueOnce({
      ...baseResult,
      status: 'failed' as const,
      stdout: 'short',
      stderr: 'err',
      failed: 1,
      total: 1,
    });

    // Clipboard rejecting
    const writeMock = jest.fn().mockRejectedValue(new Error('nope'));
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeMock },
    });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={10} />,
    );
    await user.click(screen.getByRole('button'));
    await act(async () => {
      jest.advanceTimersByTime(1100);
      await Promise.resolve();
    });
    const copyButtons = await screen.findAllByRole('button', { name: /Copy/i });
    await user.click(copyButtons[0]);
    expect(writeMock).toHaveBeenCalled();

    // Clipboard unavailable path
    const globalWithNav = globalThis as unknown as {
      navigator?: { clipboard?: { writeText: jest.Mock } };
    };
    if (globalWithNav.navigator) {
      delete globalWithNav.navigator.clipboard;
    }
    await user.click(copyButtons[1]);
  });

  it('surfaces poll exceptions via normalizeApiError', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onStart = jest.fn().mockResolvedValue({ runId: 'poll-ex' });
    const onPoll = jest.fn().mockRejectedValue(new Error('poll boom'));

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());
    await act(async () => {
      jest.advanceTimersByTime(1200);
      await Promise.resolve();
    });

    expect(await screen.findByText(/poll boom/i)).toBeInTheDocument();
  });

  it('honors maxDurationMs and ends run with error when exceeded', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onStart = jest.fn().mockResolvedValue({ runId: 'duration' });
    const onPoll = jest
      .fn()
      .mockResolvedValue({ ...baseResult, status: 'running' as const });

    render(
      <RunTestsPanel
        onStart={onStart}
        onPoll={onPoll}
        pollIntervalMs={1000}
        maxDurationMs={1}
      />,
    );

    await user.click(getTestsButton());
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(
      await screen.findByText(/This is taking longer than expected/i),
    ).toBeInTheDocument();
  });

  it('handles missing runId from onStart', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onStart = jest.fn().mockResolvedValue({});
    const onPoll = jest.fn();

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());
    await act(async () => Promise.resolve());

    expect(await screen.findByText(/Missing run id/i)).toBeInTheDocument();
    expect(onPoll).not.toHaveBeenCalled();
  });

  it('collapses expanded stdout when toggle is clicked', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const longStdout = 'x'.repeat(9001);

    const onStart = jest.fn().mockResolvedValue({ runId: 'collapse-test' });
    const onPoll = jest.fn().mockResolvedValueOnce({
      ...baseResult,
      status: 'failed' as const,
      stdout: longStdout,
      stderr: '',
      failed: 1,
      total: 1,
    });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    // Expand first
    await user.click(screen.getByRole('button', { name: /show full stdout/i }));
    expect(await screen.findByText(longStdout)).toBeInTheDocument();

    // Collapse
    await user.click(screen.getByRole('button', { name: /collapse/i }));
    expect(screen.queryByText(longStdout)).not.toBeInTheDocument();
  });

  it('expands long stderr output independently', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const longStderr = 'e'.repeat(9001);

    const onStart = jest.fn().mockResolvedValue({ runId: 'stderr-run' });
    const onPoll = jest.fn().mockResolvedValueOnce({
      ...baseResult,
      status: 'failed' as const,
      stdout: 'ok',
      stderr: longStderr,
      failed: 1,
      total: 1,
    });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());
    await act(async () => {
      jest.advanceTimersByTime(1200);
      await Promise.resolve();
    });

    expect(
      screen.queryByText(longStderr, { exact: false }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show full stderr/i }));
    expect(await screen.findByText(longStderr)).toBeInTheDocument();
  });

  it('does not dedupe toast when run id differs', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest
      .fn()
      .mockResolvedValueOnce({ runId: 'first-run' })
      .mockResolvedValueOnce({ runId: 'second-run' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ ...baseResult, status: 'passed' as const })
      .mockResolvedValueOnce({ ...baseResult, status: 'passed' as const });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={1000} />,
    );

    await user.click(getTestsButton());
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
    expect(notifyMock).toHaveBeenCalled();

    notifyMock.mockClear();
    await user.click(screen.getByRole('button', { name: /re-run tests/i }));
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
    expect(notifyMock).toHaveBeenCalled();
  });

  it('queues poll when visibility hidden during running poll', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'hidden-poll' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ ...baseResult, status: 'running' as const })
      .mockResolvedValueOnce({ ...baseResult, status: 'passed' as const });

    render(
      <RunTestsPanel
        onStart={onStart}
        onPoll={onPoll}
        pollIntervalMs={1000}
        maxPollIntervalMs={1000}
      />,
    );

    await user.click(getTestsButton());
    // First poll after initial delay (1000ms base)
    await act(async () => {
      jest.advanceTimersByTime(1100);
      await Promise.resolve();
    });

    // Now hide visibility before next poll
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    // Resume visibility
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(screen.getByText(/Tests passed/i)).toBeInTheDocument();
  });

  it('handles empty stderr output display', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'empty-stderr' });
    const onPoll = jest.fn().mockResolvedValueOnce({
      ...baseResult,
      status: 'failed' as const,
      stdout: 'some output',
      stderr: '   ',
      failed: 1,
      total: 1,
    });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={100} />,
    );

    await user.click(getTestsButton());
    await act(async () => {
      // Poll interval is at least 1000ms, so advance well past that
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/Stderr: No output captured/i)).toBeInTheDocument();
  });

  it('ignores stale poll when different run is active', async () => {
    useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest
      .fn()
      .mockResolvedValueOnce({ runId: 'run-a' })
      .mockResolvedValueOnce({ runId: 'run-b' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ ...baseResult, status: 'running' as const })
      .mockResolvedValueOnce({ ...baseResult, status: 'passed' as const });

    render(
      <RunTestsPanel
        onStart={onStart}
        onPoll={onPoll}
        pollIntervalMs={1000}
        storageKey="conflict-key"
      />,
    );

    await user.click(getTestsButton());
    await act(async () => Promise.resolve());
  });
});
