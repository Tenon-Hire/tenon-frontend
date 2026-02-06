import { act, renderHook } from '@testing-library/react';
import { useBackoffPolling, usePolling } from '@/features/shared/polling';

jest.useFakeTimers();

describe('usePolling', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('runs task once when repeat is false', async () => {
    const task = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePolling({ task, repeat: false }));

    act(() => result.current.start());
    expect(task).not.toHaveBeenCalled();

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(task).toHaveBeenCalledTimes(1);
    expect(result.current.isActive()).toBe(false);
  });

  it('repeats task while active', async () => {
    const task = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePolling({ task, intervalMs: 100, repeat: true }),
    );

    act(() => result.current.start());

    await act(async () => {
      jest.runOnlyPendingTimers(); // initial immediate tick
      await Promise.resolve();
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(task).toHaveBeenCalledTimes(3); // initial + two intervals
    act(() => result.current.cancel());
    expect(result.current.isActive()).toBe(false);
  });
});

describe('useBackoffPolling', () => {
  it('cancels on timeout and invokes callback', async () => {
    const onTimeout = jest.fn();
    const run = jest.fn().mockReturnValue(true);
    const { result } = renderHook(() =>
      useBackoffPolling({
        run,
        baseDelayMs: 10,
        maxDelayMs: 10,
        maxDurationMs: 25,
        onTimeout,
      }),
    );

    act(() => {
      result.current.start(undefined);
    });

    await act(async () => {
      jest.advanceTimersByTime(30);
      await Promise.resolve();
    });

    expect(onTimeout).toHaveBeenCalled();
    expect(result.current.isActive()).toBe(false);
  });
});
