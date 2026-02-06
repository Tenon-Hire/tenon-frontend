import { useEffect } from 'react';
import { buildLoginHref } from '@/features/auth/authPaths';
import type React from 'react';
import { useInviteInit } from './useInviteInit';
import type { CandidateSessionBootstrapResponse } from '@/lib/api/candidate';
import type { ViewState } from '../views/types';

type Params = {
  token: string;
  authToken: string | null;
  setCandidateSessionId: (id: number | null) => void;
  setBootstrap: (b: CandidateSessionBootstrapResponse) => void;
  setToken: (t: string | null) => void;
  clearTaskError: () => void;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
  setAuthMessage: (m: string | null) => void;
  setErrorMessage: (m: string | null) => void;
  setErrorStatus: (s: number | null) => void;
  fetchTask: (opts?: {
    authToken?: string;
    sessionId?: number;
  }) => Promise<void>;
  markStart: (label: string) => void;
  markEnd: (label: string, extra?: Record<string, unknown>) => void;
};

export function useInviteResolver(params: Params) {
  const { runInit, inviteErrorCopy } = useInviteInit(params);

  useEffect(() => {
    if (!params.authToken) return;
    void runInit(params.token);
  }, [params.authToken, params.token, runInit]);

  const loginHref = buildLoginHref(
    `/candidate/session/${encodeURIComponent(params.token)}`,
    'candidate',
  );

  return { runInit, loginHref, inviteErrorCopy };
}
