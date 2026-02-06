import { useEffect } from 'react';
import type { CandidateSessionState, PersistedState } from './types';
import { STORAGE_KEY } from './state';
import type { ReducerPair } from './types';

export function usePersistedState(
  state: CandidateSessionState,
  dispatch: ReducerPair['dispatch'],
) {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (typeof parsed?.inviteToken === 'string' && parsed.inviteToken) {
        dispatch({ type: 'SET_INVITE_TOKEN', inviteToken: parsed.inviteToken });
      }
      if (typeof parsed?.candidateSessionId === 'number') {
        dispatch({
          type: 'SET_CANDIDATE_SESSION_ID',
          candidateSessionId: parsed.candidateSessionId,
        });
      }
      if (parsed?.bootstrap) {
        dispatch({
          type: 'SET_BOOTSTRAP',
          bootstrap: parsed.bootstrap as NonNullable<
            PersistedState['bootstrap']
          >,
        });
      }
      if (typeof parsed?.started === 'boolean') {
        dispatch({ type: 'SET_STARTED', started: parsed.started });
      }
    } catch {}
  }, [dispatch]);

  useEffect(() => {
    try {
      const toPersist: PersistedState = {
        inviteToken: state.inviteToken,
        candidateSessionId: state.candidateSessionId,
        bootstrap: state.bootstrap,
        started: state.started,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch {}
  }, [
    state.bootstrap,
    state.inviteToken,
    state.started,
    state.candidateSessionId,
  ]);
}
