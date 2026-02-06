import type { Dispatch, SetStateAction } from 'react';
import type { useCandidateSession } from '../CandidateSessionProvider';
import type { ViewState } from '../views/types';

export type SessionCtx = ReturnType<typeof useCandidateSession>;

export type SessionActionsParams = {
  session: SessionCtx;
  token: string;
  view: ViewState;
  setView: Dispatch<SetStateAction<ViewState>>;
  setErrorMessage: (m: string | null) => void;
  setErrorStatus: (n: number | null) => void;
  setAuthMessage: (m: string | null) => void;
  markStart: (label: string) => void;
  markEnd: (label: string, extra?: Record<string, unknown>) => void;
};
