import {
  resolveCandidateInviteToken,
  type CandidateSessionBootstrapResponse,
} from '@/lib/api/candidate';
import {
  INVITE_EXPIRED_MESSAGE,
  INVITE_UNAVAILABLE_MESSAGE,
} from '@/lib/copy/invite';
import {
  friendlyBootstrapError,
  friendlyTaskError,
} from '../utils/errorMessages';
import type { ViewState } from '../CandidateSessionScreen';

export type InviteInitParams = {
  authToken: string | null;
  setCandidateSessionId: (id: number | null) => void;
  setBootstrap: (b: CandidateSessionBootstrapResponse) => void;
  setToken: (t: string | null) => void;
  clearTaskError: () => void;
  setView: (v: ViewState) => void;
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

export const inviteErrorCopy = (status: number | null, msg: string | null) =>
  msg ?? (status === 410 ? INVITE_EXPIRED_MESSAGE : INVITE_UNAVAILABLE_MESSAGE);

export function createInviteInit(params: InviteInitParams) {
  const runInit = async (
    initToken: string,
    allowRetry = false,
    authOverride?: string | null,
  ): Promise<void | 'skip'> => {
    const bearer = authOverride ?? params.authToken;
    if (!initToken) {
      params.setErrorMessage(INVITE_UNAVAILABLE_MESSAGE);
      params.setErrorStatus(400);
      params.setView('error');
      return;
    }
    if (!bearer) {
      params.setErrorStatus(401);
      params.setAuthMessage(null);
      params.setView('auth');
      return 'skip';
    }

    params.setView('loading');
    params.setErrorMessage(null);
    params.setErrorStatus(null);
    params.setAuthMessage(null);
    params.markStart('candidate:init');
    try {
      const resp = await resolveCandidateInviteToken(initToken, bearer, {
        skipCache: allowRetry,
      });
      params.setCandidateSessionId(resp.candidateSessionId);
      params.setBootstrap({
        candidateSessionId: resp.candidateSessionId,
        status: resp.status,
        simulation: resp.simulation,
      });
      params.clearTaskError();
      params.setView('starting');
      params.markEnd('candidate:init', { status: 'success' });
      await params
        .fetchTask({ authToken: bearer, sessionId: resp.candidateSessionId })
        .then(() => params.setView('running'))
        .catch((err) => {
          params.setErrorMessage(friendlyTaskError(err));
          params.setView('error');
        });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        params.setToken(null);
        params.setAuthMessage(friendlyBootstrapError(err));
        params.setErrorStatus(status ?? null);
        params.setView('auth');
        params.markEnd('candidate:init', { status: 'auth' });
      } else {
        params.setErrorStatus(status ?? null);
        params.setErrorMessage(friendlyBootstrapError(err));
        params.setView('error');
        params.markEnd('candidate:init', { status: 'error' });
      }
    }
  };

  return runInit;
}
