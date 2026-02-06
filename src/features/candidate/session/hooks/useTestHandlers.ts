import { useCallback } from 'react';
import {
  pollCandidateTestRun,
  startCandidateTestRun,
} from '@/features/candidate/api';
import type { CandidateTask } from '../CandidateSessionProvider';
import type { PollResult } from '../task/hooks/runTestsTypes';

type Params = {
  candidateSessionId: number | null;
  token: string | null;
  currentTask: CandidateTask | null;
};

export function useTestHandlers({
  candidateSessionId,
  token,
  currentTask,
}: Params) {
  const handleStartTests = useCallback(async () => {
    if (!candidateSessionId || !token || !currentTask) {
      throw new Error('Missing session context.');
    }
    return startCandidateTestRun({
      taskId: currentTask.id,
      token,
      candidateSessionId,
    });
  }, [candidateSessionId, currentTask, token]);

  const handlePollTests = useCallback(
    async (runId: string): Promise<PollResult> => {
      if (!candidateSessionId || !token || !currentTask) {
        throw new Error('Missing session context.');
      }
      return pollCandidateTestRun({
        taskId: currentTask.id,
        runId,
        token,
        candidateSessionId,
      });
    },
    [candidateSessionId, currentTask, token],
  );

  return { handleStartTests, handlePollTests };
}
