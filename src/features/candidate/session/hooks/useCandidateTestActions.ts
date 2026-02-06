import { useMemo } from 'react';
import { useTestHandlers } from './useTestHandlers';
import type { SessionCtx } from './useCandidateSessionActions.types';

type Params = {
  session: SessionCtx;
};

export function useCandidateTestActions({ session }: Params) {
  const { handleStartTests, handlePollTests } = useTestHandlers({
    candidateSessionId: session.state.candidateSessionId,
    token: session.state.token,
    currentTask: session.state.taskState.currentTask,
  });

  return useMemo(
    () => ({
      handleStartTests,
      handlePollTests,
    }),
    [handlePollTests, handleStartTests],
  );
}
