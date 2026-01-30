import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { CandidateSessionProvider, useCandidateSession } from '@/features/candidate/session/CandidateSessionProvider';
import { BRAND_SLUG } from '@/lib/brand';

const fetchAuthAccessTokenMock = jest.fn();

jest.mock('@/lib/auth/accessToken', () => ({
  fetchAuthAccessToken: (...args: unknown[]) => fetchAuthAccessTokenMock(...args),
}));

const renderWithProvider = () =>
  renderHook(() => useCandidateSession(), {
    wrapper: ({ children }) => <CandidateSessionProvider>{children}</CandidateSessionProvider>,
  });

describe('CandidateSessionProvider', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    sessionStorage.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  const storageKey = `${BRAND_SLUG}:candidate_session_v1`;

  it('restores persisted invite, session id, bootstrap, and started flag', () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        inviteToken: 'inv',
        candidateSessionId: 9,
        bootstrap: { candidateSessionId: 9, status: 'in_progress', simulation: { title: 'Sim', role: 'Role' } },
        started: true,
      }),
    );

    const { result } = renderWithProvider();
    expect(result.current.state.inviteToken).toBe('inv');
    expect(result.current.state.candidateSessionId).toBe(9);
    expect(result.current.state.bootstrap?.simulation.title).toBe('Sim');
    expect(result.current.state.started).toBe(true);
  });

  it('loadAccessToken sets token and ready status on success', async () => {
    fetchAuthAccessTokenMock.mockResolvedValue('tok-123');
    const { result } = renderWithProvider();

    await act(async () => {
      await result.current.loadAccessToken();
    });

    expect(result.current.state.token).toBe('tok-123');
    expect(result.current.state.authStatus).toBe('ready');
  });

  it('loadAccessToken sets unauthenticated for 401/403', async () => {
    fetchAuthAccessTokenMock.mockRejectedValue({ status: 401 });
    const { result } = renderWithProvider();

    await act(async () => {
      await result.current.loadAccessToken();
    });

    expect(result.current.state.authStatus).toBe('unauthenticated');
    expect(result.current.state.token).toBeNull();
  });

  it('loadAccessToken sets error for other failures', async () => {
    fetchAuthAccessTokenMock.mockRejectedValue(new Error('boom'));
    const { result } = renderWithProvider();

    await act(async () => {
      await result.current.loadAccessToken();
    });

    expect(result.current.state.authStatus).toBe('error');
    expect(result.current.state.authError).toMatch(/Unable to authenticate/);
  });

  it('persists minimal state on changes', () => {
    const { result } = renderWithProvider();
    act(() => {
      result.current.setInviteToken('new');
      result.current.setCandidateSessionId(7);
      result.current.setBootstrap({
        candidateSessionId: 7,
        status: 'in_progress',
        simulation: { title: 'T', role: 'R' },
      });
      result.current.setStarted(true);
    });
    const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
    expect(stored.inviteToken).toBe('new');
    expect(stored.candidateSessionId).toBe(7);
    expect(stored.started).toBe(true);
  });
});
