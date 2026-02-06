import { useMemo } from 'react';
import { useTaskLoader } from './useTaskLoader';
import { useTaskSubmission } from './useTaskSubmission';
import type { SessionCtx } from './useCandidateSessionActions.types';

type Params = {
  session: SessionCtx;
  markStart: (label: string) => void;
  markEnd: (label: string, extra?: Record<string, unknown>) => void;
};

export function useCandidateTaskActions({
  session,
  markStart,
  markEnd,
}: Params) {
  const { fetchCurrentTask } = useTaskLoader({
    candidateSessionId: session.state.candidateSessionId,
    token: session.state.token,
    clearTaskError: session.clearTaskError,
    setTaskLoading: session.setTaskLoading,
    setTaskLoaded: session.setTaskLoaded,
    setTaskError: session.setTaskError,
    markStart,
    markEnd,
  });

  const { submitting, handleSubmit } = useTaskSubmission({
    token: session.state.token,
    candidateSessionId: session.state.candidateSessionId,
    currentTask: session.state.taskState.currentTask,
    clearTaskError: session.clearTaskError,
    setTaskError: session.setTaskError,
    refreshTask: (opts) => fetchCurrentTask(undefined, opts),
  });

  return useMemo(
    () => ({
      fetchCurrentTask,
      submitting,
      handleSubmit,
    }),
    [fetchCurrentTask, handleSubmit, submitting],
  );
}
