import { act, renderHook } from '@testing-library/react';
import { useSubmitHandler } from '@/features/candidate/session/task/hooks/useSubmitHandler';

jest.useFakeTimers();

const buildResponse = () => ({
  submissionId: 1,
  taskId: 10,
  candidateSessionId: 99,
  submittedAt: new Date().toISOString(),
  progress: { completed: 1, total: 3 },
  isComplete: false,
});

describe('useSubmitHandler', () => {
  it('sets submitted state then resets via backoff timer', async () => {
    const onSubmit = jest.fn().mockResolvedValue(buildResponse());
    const { result } = renderHook(() => useSubmitHandler(onSubmit));

    await act(async () => {
      await result.current.handleSubmit({});
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(result.current.submitStatus).toBe('submitted');
    expect(result.current.lastProgress).toEqual({ completed: 1, total: 3 });

    await act(async () => {
      jest.advanceTimersByTime(950);
      await Promise.resolve();
    });

    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.lastProgress).toBeNull();
  });

  it('ignores duplicate submits while busy', async () => {
    const onSubmit = jest.fn().mockResolvedValue(buildResponse());
    const { result } = renderHook(() => useSubmitHandler(onSubmit));

    await act(async () => {
      const first = result.current.handleSubmit({});
      const second = result.current.handleSubmit({});
      await Promise.all([first, second]);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
