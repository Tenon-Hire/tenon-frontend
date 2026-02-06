import { useEffect, useRef, useState } from 'react';
import { useTaskSubmitHandler } from './useTaskSubmitHandler';
import type { Task } from '../task/types';

type Params = {
  token: string | null;
  candidateSessionId: number | null;
  currentTask: Task | null;
  clearTaskError: () => void;
  setTaskError: (msg: string) => void;
  refreshTask: (opts?: { skipCache?: boolean }) => Promise<void>;
};

export function useTaskSubmission({
  token,
  candidateSessionId,
  currentTask,
  clearTaskError,
  setTaskError,
  refreshTask,
}: Params) {
  const [submitting, setSubmitting] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const { handleSubmit } = useTaskSubmitHandler({
    token,
    candidateSessionId,
    currentTask,
    clearTaskError,
    setTaskError,
    refreshTask,
    setSubmitting,
    setRefreshTimer: (cb) => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(cb, 900);
    },
  });

  return { submitting, handleSubmit };
}
