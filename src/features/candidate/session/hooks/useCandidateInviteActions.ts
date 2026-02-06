import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { useInviteResolver } from './useInviteResolver';
import type { SessionCtx } from './useCandidateSessionActions.types';
import type { ViewState } from '../views/types';

type Params = {
  session: SessionCtx;
  token: string;
  setView: Dispatch<SetStateAction<ViewState>>;
  setAuthMessage: (m: string | null) => void;
  setErrorMessage: (m: string | null) => void;
  setErrorStatus: (s: number | null) => void;
  fetchCurrentTask: (overrides?: {
    authToken?: string;
    sessionId?: number;
  }) => Promise<void>;
  markStart: (label: string) => void;
  markEnd: (label: string, extra?: Record<string, unknown>) => void;
};

export function useCandidateInviteActions(params: Params) {
  const { runInit, loginHref, inviteErrorCopy } = useInviteResolver({
    token: params.token,
    authToken: params.session.state.token,
    setCandidateSessionId: params.session.setCandidateSessionId,
    setBootstrap: params.session.setBootstrap,
    setToken: params.session.setToken,
    clearTaskError: params.session.clearTaskError,
    setView: params.setView,
    setAuthMessage: params.setAuthMessage,
    setErrorMessage: params.setErrorMessage,
    setErrorStatus: params.setErrorStatus,
    fetchTask: params.fetchCurrentTask,
    markStart: params.markStart,
    markEnd: params.markEnd,
  });

  return useMemo(
    () => ({ runInit, loginHref, inviteErrorCopy }),
    [inviteErrorCopy, loginHref, runInit],
  );
}
