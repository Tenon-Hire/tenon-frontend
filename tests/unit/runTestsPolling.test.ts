import { act, renderHook } from '@testing-library/react';
import { useBackoffPolling } from '@/shared/polling/useBackoffPolling';

jest.useFakeTimers();

describe('useBackoffPolling', () => {
  it('invokes onMaxAttempts and stops', async () => {
    const run = jest.fn().mockResolvedValue(true);
    const onMaxAttempts = jest.fn();

    const { result } = renderHook(() =>
      useBackoffPolling({
        run,
        baseDelayMs: 5,
        maxDelayMs: 5,
        maxAttempts: 1,
        onMaxAttempts,
      }),
    );

    act(() => {
      result.current.start('ctx');
    });

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(onMaxAttempts).toHaveBeenCalledTimes(1);
    expect(result.current.isActive()).toBe(false);
  });

  it('invokes onTimeout when duration exceeded', async () => {
    const run = jest.fn().mockResolvedValue(true);
    const onTimeout = jest.fn();

    const { result } = renderHook(() =>
      useBackoffPolling({
        run,
        baseDelayMs: 5,
        maxDelayMs: 5,
        maxDurationMs: 1,
        onTimeout,
      }),
    );

    act(() => {
      result.current.start('ctx');
    });

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(result.current.isActive()).toBe(false);
  });
});
