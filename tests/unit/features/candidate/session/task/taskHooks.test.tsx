import { act, renderHook } from '@testing-library/react';
import {
  useTaskDrafts,
  useSubmitHandler,
} from '@/features/candidate/session/task/hooks/taskHooks';

jest.useFakeTimers();

const saveTextDraft = jest.fn();
const loadTextDraft = jest.fn(() => 'cached');
const clearTextDraft = jest.fn();

jest.mock('@/features/candidate/session/task/utils/draftStorage', () => ({
  saveTextDraft: (...args: unknown[]) => saveTextDraft(...args),
  loadTextDraft: (...args: unknown[]) => loadTextDraft(...args),
  clearTextDraft: (...args: unknown[]) => clearTextDraft(...args),
}));

describe('useTaskDrafts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  type MinimalTask = { id: number; type: 'design' | 'code'; dayIndex: number };

  it('saves drafts on debounce and clears for github native tasks', () => {
    const { result, rerender } = renderHook(
      (task: MinimalTask) => useTaskDrafts(task),
      {
        initialProps: { id: 1, type: 'design', dayIndex: 1 },
      },
    );

    act(() => {
      result.current.setText('hello');
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(saveTextDraft).toHaveBeenCalledWith(1, 'hello');

    rerender({ id: 2, type: 'code', dayIndex: 2 });
    act(() => {
      jest.advanceTimersByTime(10);
    });
    // For github native, drafts cleared
    expect(loadTextDraft).toHaveBeenCalled();
    expect(result.current.text).toBe('');
  });

  it('saveDraftNow sets savedAt and clears later, clearDrafts clears storage', () => {
    const { result } = renderHook(() =>
      useTaskDrafts({ id: 3, type: 'design', dayIndex: 1 }),
    );

    act(() => {
      result.current.saveDraftNow();
    });
    expect(saveTextDraft).toHaveBeenCalled();
    expect(result.current.savedAt).not.toBeNull();
    act(() => {
      jest.advanceTimersByTime(1600);
    });
    expect(result.current.savedAt).toBeNull();

    act(() => {
      result.current.clearDrafts();
    });
    expect(clearTextDraft).toHaveBeenCalledWith(3);
  });
});

describe('useSubmitHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns busy when already submitting', async () => {
    const onSubmit = jest.fn(() => new Promise(() => {})); // never resolves
    const { result, rerender } = renderHook(() => useSubmitHandler(onSubmit));

    act(() => {
      result.current.handleSubmit({});
    });
    rerender();
    let second: unknown;
    await act(async () => {
      second = await result.current.handleSubmit({});
    });
    expect(second).toEqual({ status: 'busy' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('sets submitted status then resets after timer', async () => {
    jest.useFakeTimers();
    const onSubmit = jest.fn().mockResolvedValue({
      submissionId: 1,
      taskId: 2,
      candidateSessionId: 3,
      submittedAt: 'now',
      progress: { completed: 2, total: 5 },
      isComplete: false,
    });
    const { result } = renderHook(() => useSubmitHandler(onSubmit));

    await act(async () => {
      await result.current.handleSubmit({});
    });

    expect(result.current.submitStatus).toBe('submitted');
    act(() => {
      jest.advanceTimersByTime(950);
    });
    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.lastProgress).toBeNull();
    jest.useRealTimers();
  });

  it('sets idle when submit throws', async () => {
    jest.useFakeTimers();
    const onSubmit = jest.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useSubmitHandler(onSubmit));

    await act(async () => {
      const resp = await result.current.handleSubmit({});
      expect(resp).toBe('submit-failed');
    });
    expect(result.current.submitStatus).toBe('idle');
    jest.useRealTimers();
  });
});
