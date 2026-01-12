import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunTestsPanel } from '@/features/candidate/session/task/components/RunTestsPanel';

const realConsoleError = console.error;

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
    act(() => {
      jest.runOnlyPendingTimers();
    });
    act(() => {});
    jest.useRealTimers();
  });

  it('starts a run and polls until success', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'run-1' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ status: 'running' as const })
      .mockResolvedValueOnce({
        status: 'passed' as const,
        message: 'Checks green',
      });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={200} />,
    );

    await user.click(screen.getByRole('button', { name: /run tests/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Preparing test run/i)).toBeInTheDocument();

    expect(
      await screen.findByRole('button', { name: /Running tests/i }),
    ).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });
    expect(onPoll).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });
    expect(onPoll).toHaveBeenCalledTimes(2);

    expect(await screen.findByText(/Checks green/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /re-run tests/i })).toBeEnabled();
  });

  it('prevents duplicate runs while running and allows retry after failure', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'r-2' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ status: 'failed' as const, message: 'Red' });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={100} />,
    );

    const cta = screen.getByRole('button', { name: /run tests/i });
    await user.click(cta);
    await user.click(cta);

    expect(onStart).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Red/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run tests/i }));
    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it('times out after max polling attempts when runs never finish', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'stuck' });
    const onPoll = jest.fn().mockResolvedValue({ status: 'running' as const });

    render(
      <RunTestsPanel
        onStart={onStart}
        onPoll={onPoll}
        pollIntervalMs={50}
        maxAttempts={2}
      />,
    );

    await user.click(screen.getByRole('button', { name: /run tests/i }));

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/Tests timed out/i)).toBeInTheDocument();
  });

  it('uses default messages for passed, timeout, and error statuses', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockResolvedValue({ runId: 'run-defaults' });
    const onPoll = jest
      .fn()
      .mockResolvedValueOnce({ status: 'passed' as const })
      .mockResolvedValueOnce({ status: 'timeout' as const })
      .mockResolvedValueOnce({ status: 'error' as const });

    render(
      <RunTestsPanel
        onStart={onStart}
        onPoll={onPoll}
        pollIntervalMs={80}
        maxAttempts={3}
      />,
    );

    await user.click(screen.getByRole('button', { name: /run tests/i }));
    await act(async () => {
      jest.advanceTimersByTime(80);
      await Promise.resolve();
    });
    expect(
      await screen.findByText(/Tests passed\. You can submit your work\./i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /re-run tests/i }));
    await act(async () => {
      jest.advanceTimersByTime(80);
      await Promise.resolve();
    });
    expect(await screen.findByText(/Tests timed out/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run tests/i }));
    await act(async () => {
      jest.advanceTimersByTime(80);
      await Promise.resolve();
    });
    expect(
      await screen.findByText(/Unable to run tests right now/i),
    ).toBeInTheDocument();
  });

  it('surfaces errors from start and poll failures', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest.fn().mockRejectedValue(new Error('fail to start'));
    const onPoll = jest.fn().mockRejectedValue(new Error('poll failed'));

    const { rerender } = render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={40} />,
    );

    await user.click(screen.getByRole('button', { name: /run tests/i }));
    await act(async () => Promise.resolve());

    expect(
      await screen.findByText(/Failed to start tests/i),
    ).toBeInTheDocument();

    // Retry and hit polling error
    const nextStart = jest.fn().mockResolvedValue({ runId: 'r-err' });
    rerender(
      <RunTestsPanel onStart={nextStart} onPoll={onPoll} pollIntervalMs={40} />,
    );

    await user.click(screen.getByRole('button', { name: /run tests/i }));
    await act(async () => Promise.resolve());

    await act(async () => {
      jest.advanceTimersByTime(40);
      await Promise.resolve();
    });

    expect(nextStart).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Unable to run tests/i)).toBeInTheDocument();
  });

  it('clears start errors after a successful run start', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const onStart = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail to start'))
      .mockResolvedValueOnce({ runId: 'r-ok' });
    const onPoll = jest.fn().mockResolvedValue({ status: 'running' as const });

    render(
      <RunTestsPanel onStart={onStart} onPoll={onPoll} pollIntervalMs={40} />,
    );

    await user.click(screen.getByRole('button', { name: /run tests/i }));
    await act(async () => Promise.resolve());

    expect(
      await screen.findByText(/Failed to start tests/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run tests/i }));
    expect(onStart).toHaveBeenCalledTimes(2);

    expect(await screen.findByText(/Tests are running/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Failed to start tests/i),
    ).not.toBeInTheDocument();
  });
});
