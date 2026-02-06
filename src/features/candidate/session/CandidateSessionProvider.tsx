'use client';
import { useEffect, useMemo, useReducer } from 'react';
import {
  CandidateSessionContext,
  useCandidateSession,
} from './provider/context';
import { initialState, reducer } from './provider/state';
import { useSessionActions } from './provider/actions';
import { usePersistedState } from './provider/persistence';

export function CandidateSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const actions = useSessionActions(state, dispatch);

  usePersistedState(state, dispatch);

  useEffect(() => {
    if (state.token || state.authStatus !== 'idle') return;
    void actions.loadAccessToken();
  }, [actions, state.authStatus, state.token]);

  const value = useMemo(
    () => ({
      state,
      ...actions,
    }),
    [actions, state],
  );

  return (
    <CandidateSessionContext.Provider value={value}>
      {children}
    </CandidateSessionContext.Provider>
  );
}

export { useCandidateSession };

export type {
  CandidateBootstrap,
  CandidateTask,
  CandidateSessionState,
} from './provider/types';
