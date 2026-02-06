import { act, renderHook } from '@testing-library/react';
import { useToastQueue } from '@/features/shared/notifications/hooks/useToastQueue';

describe('useToastQueue', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('auto dismisses non-sticky toasts after duration', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useToastQueue());

    act(() =>
      result.current.notify({
        id: 't1',
        tone: 'info',
        title: 'Hello',
        durationMs: 100,
      }),
    );
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('keeps sticky toasts until dismissed', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useToastQueue());

    act(() =>
      result.current.notify({
        id: 'sticky',
        tone: 'success',
        title: 'Saved',
        sticky: true,
        durationMs: 50,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => result.current.dismiss('sticky'));

    expect(result.current.toasts).toHaveLength(0);
  });
});
