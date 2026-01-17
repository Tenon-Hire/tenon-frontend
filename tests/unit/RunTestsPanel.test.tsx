import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunTestsPanel } from '@/features/candidate/session/task/components/RunTestsPanel';

const realConsoleError = console.error;
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
    if (typeof message === 'string' && message.includes('not wrapped in act')) {
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
});
