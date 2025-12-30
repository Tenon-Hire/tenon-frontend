import { useCallback, useRef } from 'react';
import {
  getCandidateCurrentTask,
  type CandidateCurrentTaskResponse,
} from '@/lib/api/candidate';
import { friendlyTaskError } from '../utils/errorMessages';
import { normalizeCompletedTaskIds, toTask } from '../utils/taskTransforms';
import type { Task } from '../task/types';

type Params = {
  token: string | null;
  candidateSessionId: number | null;
  setTaskLoading: () => void;
  setTaskLoaded: (p: {
    isComplete: boolean;
    completedTaskIds: number[];
    currentTask: Task | null;
  }) => void;
  setTaskError: (msg: string) => void;
  clearTaskError: () => void;
};

export function useCurrentTask({
  token,
  candidateSessionId,
  setTaskLoading,
  setTaskLoaded,
  setTaskError,
  clearTaskError,
}: Params) {
  const inFlightRef = useRef(false);

  const fetchCurrentTask = useCallback(async () => {
    if (!token || !candidateSessionId) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    clearTaskError();
    setTaskLoading();

    try {
      const dto: CandidateCurrentTaskResponse = await getCandidateCurrentTask(
        candidateSessionId,
        token,
      );

      setTaskLoaded({
        isComplete: Boolean(dto.isComplete),
        completedTaskIds: normalizeCompletedTaskIds(dto),
        currentTask: toTask(dto.currentTask),
      });
    } catch (err) {
      setTaskError(friendlyTaskError(err));
    } finally {
      inFlightRef.current = false;
    }
  }, [
    candidateSessionId,
    clearTaskError,
    setTaskError,
    setTaskLoaded,
    setTaskLoading,
    token,
  ]);

  return { fetchCurrentTask };
}
