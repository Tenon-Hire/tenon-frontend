import { useCallback, useRef } from 'react';
import { getCandidateCurrentTask } from '@/lib/api/candidate';
import { normalizeCompletedTaskIds, toTask } from '../utils/taskTransforms';
import type { CandidateTask } from '../CandidateSessionProvider';

type TaskLoaderDeps = {
  candidateSessionId: number | null;
  token: string | null;
  clearTaskError: () => void;
  setTaskLoading: () => void;
  setTaskLoaded: (payload: {
    isComplete: boolean;
    completedTaskIds: number[];
    currentTask: CandidateTask | null;
  }) => void;
  setTaskError: (msg: string) => void;
  markStart: (label: string) => void;
  markEnd: (label: string, extra?: Record<string, unknown>) => void;
};

export function useTaskLoader({
  candidateSessionId,
  token,
  clearTaskError,
  setTaskLoading,
  setTaskLoaded,
  setTaskError,
  markStart,
  markEnd,
}: TaskLoaderDeps) {
  const taskInFlightRef = useRef(false);

  const fetchCurrentTask = useCallback(
    async (
      overrides?: { authToken?: string; sessionId?: number },
      options?: { skipCache?: boolean },
    ) => {
      const authToken = overrides?.authToken ?? token;
      const sessionId = overrides?.sessionId ?? candidateSessionId;
      if (!authToken || !sessionId) return;
      if (taskInFlightRef.current) return;

      taskInFlightRef.current = true;
      markStart('candidate:task:fetch');
      clearTaskError();
      setTaskLoading();

      try {
        const dto = options
          ? await getCandidateCurrentTask(sessionId, authToken, options)
          : await getCandidateCurrentTask(sessionId, authToken);
        if (!dto) throw new Error('Unable to load current task.');
        setTaskLoaded({
          isComplete: Boolean(dto.isComplete),
          completedTaskIds: normalizeCompletedTaskIds(dto),
          currentTask: toTask(dto.currentTask),
        });
        markEnd('candidate:task:fetch', { sessionId, result: 'success' });
      } catch (err) {
        setTaskError((err as { message?: string }).message ?? 'Unable to load');
        markEnd('candidate:task:fetch', { sessionId, result: 'error' });
        throw err;
      } finally {
        taskInFlightRef.current = false;
      }
    },
    [
      candidateSessionId,
      clearTaskError,
      markEnd,
      markStart,
      setTaskError,
      setTaskLoaded,
      setTaskLoading,
      token,
    ],
  );

  return { fetchCurrentTask };
}
