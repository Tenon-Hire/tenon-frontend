import { useCallback } from 'react';
import { fetchAuthAccessToken } from '@/lib/auth/accessToken';
import type { CandidateBootstrap, CandidateSessionState } from './types';
import type { ReducerPair } from './types';

export function useSessionActions(
  state: CandidateSessionState,
  dispatch: ReducerPair['dispatch'],
) {
  const setInviteToken = useCallback(
    (token: string) =>
      dispatch({ type: 'SET_INVITE_TOKEN', inviteToken: token }),
    [dispatch],
  );
  const setToken = useCallback(
    (token: string | null) => dispatch({ type: 'SET_TOKEN', token }),
    [dispatch],
  );
  const setCandidateSessionId = useCallback(
    (candidateSessionId: number | null) =>
      dispatch({ type: 'SET_CANDIDATE_SESSION_ID', candidateSessionId }),
    [dispatch],
  );
  const setBootstrap = useCallback(
    (bootstrap: CandidateBootstrap) =>
      dispatch({ type: 'SET_BOOTSTRAP', bootstrap }),
    [dispatch],
  );
  const setStarted = useCallback(
    (started: boolean) => dispatch({ type: 'SET_STARTED', started }),
    [dispatch],
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [dispatch]);

  const setTaskLoading = useCallback(
    () => dispatch({ type: 'TASK_LOADING' }),
    [dispatch],
  );
  const setTaskLoaded = useCallback(
    (payload: {
      isComplete: boolean;
      completedTaskIds: number[];
      currentTask: CandidateSessionState['taskState']['currentTask'];
    }) => dispatch({ type: 'TASK_LOADED', payload }),
    [dispatch],
  );
  const setTaskError = useCallback(
    (error: string) => dispatch({ type: 'TASK_ERROR', error }),
    [dispatch],
  );
  const clearTaskError = useCallback(
    () => dispatch({ type: 'TASK_CLEAR_ERROR' }),
    [dispatch],
  );

  const loadAccessToken = useCallback(async () => {
    if (state.authStatus === 'loading') return null;
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const token = await fetchAuthAccessToken();
      dispatch({ type: 'SET_TOKEN', token });
      dispatch({ type: 'AUTH_READY' });
      return token;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        dispatch({ type: 'AUTH_UNAUTHENTICATED' });
        return null;
      }
      dispatch({
        type: 'AUTH_ERROR',
        error: 'Unable to authenticate. Please try again.',
      });
      return null;
    }
  }, [dispatch, state.authStatus]);

  return {
    setInviteToken,
    setToken,
    setCandidateSessionId,
    setBootstrap,
    setStarted,
    reset,
    loadAccessToken,
    setTaskLoading,
    setTaskLoaded,
    setTaskError,
    clearTaskError,
  };
}
