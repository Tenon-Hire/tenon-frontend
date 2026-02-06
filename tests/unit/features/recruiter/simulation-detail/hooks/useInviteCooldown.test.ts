import { act, renderHook } from '@testing-library/react';
import { useInviteCooldown } from '@/features/recruiter/simulations/detail/hooks/useInviteCooldown';
import type { RowState } from '@/features/recruiter/simulations/detail/hooks/types';

jest.useFakeTimers();

describe('useInviteCooldown', () => {
  it('ticks cooldown and clears when finished', () => {
    const updates: Array<{
      cooldownUntilMs: number | null;
      message: string | null;
    }> = [];
    const updateRow = jest.fn(
      (id: string, next: (prev: RowState) => RowState) => {
        const prev: RowState = { cooldownUntilMs: null, message: null };
        const nextState = next(prev);
        updates.push({
          cooldownUntilMs: nextState.cooldownUntilMs ?? null,
          message: nextState.message ?? null,
        });
      },
    );

    const { result } = renderHook(() => useInviteCooldown(updateRow));

    act(() => {
      result.current('row-1', 1);
    });

    expect(updates[0]?.message).toMatch(/Retry in/);

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    const last = updates[updates.length - 1];
    expect(last.cooldownUntilMs).toBeNull();
    expect(last.message).toBeNull();
  });
});
