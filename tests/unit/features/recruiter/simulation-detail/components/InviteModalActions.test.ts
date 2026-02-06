import { renderHook, act } from '@testing-library/react';
import { useInviteModalActions } from '@/features/recruiter/simulations/detail/components/InviteModalActions';

describe('useInviteModalActions', () => {
  it('opens modal after resetting state', () => {
    const resetInviteFlow = jest.fn();
    const setInviteModalOpen = jest.fn();

    const { result } = renderHook(() =>
      useInviteModalActions({ resetInviteFlow, setInviteModalOpen }),
    );

    act(() => {
      result.current.openInviteModal();
    });

    expect(resetInviteFlow).toHaveBeenCalledTimes(1);
    expect(setInviteModalOpen).toHaveBeenCalledWith(true);
  });

  it('closes modal after resetting state', () => {
    const resetInviteFlow = jest.fn();
    const setInviteModalOpen = jest.fn();

    const { result } = renderHook(() =>
      useInviteModalActions({ resetInviteFlow, setInviteModalOpen }),
    );

    act(() => {
      result.current.closeInviteModal();
    });

    expect(resetInviteFlow).toHaveBeenCalledTimes(1);
    expect(setInviteModalOpen).toHaveBeenCalledWith(false);
  });
});
