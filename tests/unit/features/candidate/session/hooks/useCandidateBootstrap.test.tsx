/**
 * Tests for useCandidateBootstrap hook
 */
import { renderHook, act } from '@testing-library/react';
import { useCandidateBootstrap } from '@/features/candidate/session/hooks/useCandidateBootstrap';

const resolveCandidateInviteTokenMock = jest.fn();

jest.mock('@/features/candidate/api', () => ({
  resolveCandidateInviteToken: (...args: unknown[]) =>
    resolveCandidateInviteTokenMock(...args),
}));

jest.mock('@/features/candidate/session/utils/errorMessages', () => ({
  friendlyBootstrapError: (err: unknown) =>
    (err as Error)?.message || 'An error occurred',
}));

describe('useCandidateBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in idle state', () => {
    const onResolved = jest.fn();
    const { result } = renderHook(() =>
      useCandidateBootstrap({
        inviteToken: null,
        authToken: null,
        onResolved,
      }),
    );

    expect(result.current.state).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.errorStatus).toBeNull();
  });

  it('does nothing when authToken is missing', async () => {
    const onResolved = jest.fn();
    const { result } = renderHook(() =>
      useCandidateBootstrap({
        inviteToken: 'invite-token',
        authToken: null,
        onResolved,
      }),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.state).toBe('idle');
    expect(resolveCandidateInviteTokenMock).not.toHaveBeenCalled();
  });

  it('sets error when inviteToken is missing', async () => {
    const onResolved = jest.fn();
    const { result } = renderHook(() =>
      useCandidateBootstrap({
        inviteToken: null,
        authToken: 'auth-token',
        onResolved,
      }),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.errorMessage).toBe('Missing invite token.');
    expect(result.current.errorStatus).toBeNull();
  });

  it('resolves successfully', async () => {
    const mockData = { candidateSessionId: 123, currentTask: null };
    resolveCandidateInviteTokenMock.mockResolvedValue(mockData);

    const onResolved = jest.fn();
    const onSetInviteToken = jest.fn();

    const { result } = renderHook(() =>
      useCandidateBootstrap({
        inviteToken: 'invite-token',
        authToken: 'auth-token',
        onResolved,
        onSetInviteToken,
      }),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.state).toBe('ready');
    expect(result.current.errorMessage).toBeNull();
    expect(onSetInviteToken).toHaveBeenCalledWith('invite-token');
    expect(onResolved).toHaveBeenCalledWith(mockData);
    expect(resolveCandidateInviteTokenMock).toHaveBeenCalledWith(
      'invite-token',
      'auth-token',
    );
  });

  it('handles API error with status', async () => {
    resolveCandidateInviteTokenMock.mockRejectedValue({
      message: 'Session expired',
      status: 401,
    });

    const onResolved = jest.fn();
    const { result } = renderHook(() =>
      useCandidateBootstrap({
        inviteToken: 'invite-token',
        authToken: 'auth-token',
        onResolved,
      }),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.errorMessage).toBe('Session expired');
    expect(result.current.errorStatus).toBe(401);
    expect(onResolved).not.toHaveBeenCalled();
  });

  it('handles API error without status', async () => {
    resolveCandidateInviteTokenMock.mockRejectedValue(
      new Error('Network error'),
    );

    const onResolved = jest.fn();
    const { result } = renderHook(() =>
      useCandidateBootstrap({
        inviteToken: 'invite-token',
        authToken: 'auth-token',
        onResolved,
      }),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.errorMessage).toBe('Network error');
    expect(result.current.errorStatus).toBeNull();
  });

  it('deduplicates concurrent requests for same token', async () => {
    let resolvePromise: ((data: unknown) => void) | null = null;
    resolveCandidateInviteTokenMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const onResolved = jest.fn();
    const { result } = renderHook(() =>
      useCandidateBootstrap({
        inviteToken: 'same-token',
        authToken: 'auth-token',
        onResolved,
      }),
    );

    // Start first request
    void act(() => {
      void result.current.load();
    });

    // Try to start second request with same token (should be ignored)
    void act(() => {
      void result.current.load();
    });

    expect(resolveCandidateInviteTokenMock).toHaveBeenCalledTimes(1);

    // Resolve the promise
    await act(async () => {
      resolvePromise?.({ candidateSessionId: 123 });
    });

    expect(result.current.state).toBe('ready');
  });

  it('allows new request after previous completes', async () => {
    resolveCandidateInviteTokenMock
      .mockResolvedValueOnce({ candidateSessionId: 1 })
      .mockResolvedValueOnce({ candidateSessionId: 2 });

    const onResolved = jest.fn();
    const { result, rerender } = renderHook(
      ({ token }) =>
        useCandidateBootstrap({
          inviteToken: token,
          authToken: 'auth-token',
          onResolved,
        }),
      { initialProps: { token: 'token-1' } },
    );

    // First request
    await act(async () => {
      await result.current.load();
    });

    expect(onResolved).toHaveBeenCalledWith({ candidateSessionId: 1 });

    // Change token and make new request
    rerender({ token: 'token-2' });

    await act(async () => {
      await result.current.load();
    });

    expect(resolveCandidateInviteTokenMock).toHaveBeenCalledTimes(2);
    expect(onResolved).toHaveBeenLastCalledWith({ candidateSessionId: 2 });
  });

  it('works without onSetInviteToken callback', async () => {
    resolveCandidateInviteTokenMock.mockResolvedValue({
      candidateSessionId: 1,
    });

    const onResolved = jest.fn();
    const { result } = renderHook(() =>
      useCandidateBootstrap({
        inviteToken: 'token',
        authToken: 'auth',
        onResolved,
        // onSetInviteToken not provided
      }),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.state).toBe('ready');
  });
});
