import { useEffect } from 'react';
import type React from 'react';
import { friendlyTaskError } from '../utils/errorMessages';
import type { ViewState } from '../CandidateSessionScreen';
import type { CandidateSessionState } from '../CandidateSessionProvider';

type Params = {
  view: ViewState;
  state: CandidateSessionState;
  fetchCurrentTask: (
    overrides?: { authToken?: string; sessionId?: number },
    options?: { skipCache?: boolean },
  ) => Promise<void>;
  setErrorMessage: (m: string | null) => void;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
};

export function useTaskAutoload({
  view,
  state,
  fetchCurrentTask,
  setErrorMessage,
  setView,
}: Params) {
  useEffect(() => {
    if (view === 'auth' || view === 'error') return;
    if (!state.token || !state.candidateSessionId) return;
    if (
      state.taskState.loading ||
      state.taskState.isComplete ||
      state.taskState.currentTask
    )
      return;
    setView((prev) => (prev === 'loading' ? 'starting' : 'running'));
    void fetchCurrentTask().catch((err) => {
      setErrorMessage(friendlyTaskError(err));
      setView('error');
    });
  }, [fetchCurrentTask, setErrorMessage, setView, state, view]);
}
