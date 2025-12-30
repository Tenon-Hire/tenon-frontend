import { useCallback, useEffect, useRef, useState } from 'react';
import {
  submitCandidateTask,
  type CandidateTaskSubmitResponse,
} from '@/lib/api/candidate';
import { friendlySubmitError } from '../utils/errorMessages';
import { isCodeTask, isTextTask } from '../task/utils/taskGuards';
import type { Task } from '../task/types';
import type { SubmitPayload } from '../task/types';

type Params = {
  token: string | null;
  candidateSessionId: number | null;
  currentTask: Task | null;
  clearTaskError: () => void;
  setTaskError: (msg: string) => void;
  refreshTask: () => Promise<void>;
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

  const handleSubmit = useCallback(
    async (
      payload: SubmitPayload,
    ): Promise<CandidateTaskSubmitResponse | void> => {
      if (!token || !candidateSessionId || !currentTask) return;

      const type = String(currentTask.type);
      const wantsText = isTextTask(type);
      const wantsCode = isCodeTask(type);

      if (wantsText) {
        const trimmed = (payload.contentText ?? '').trim();
        if (!trimmed) {
          setTaskError('Please enter an answer before submitting.');
          return;
        }
      }

      if (wantsCode) {
        const trimmedCode = (payload.codeBlob ?? '').trim();
        if (!trimmedCode) {
          setTaskError('Please write some code before submitting.');
          return;
        }
      }

      setSubmitting(true);
      clearTaskError();

      try {
        const resp = await submitCandidateTask({
          taskId: currentTask.id,
          token,
          candidateSessionId,
          contentText: payload.contentText,
          codeBlob: payload.codeBlob,
        });

        if (refreshTimerRef.current) {
          window.clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = window.setTimeout(() => {
          void refreshTask();
        }, 900);

        return resp;
      } catch (err) {
        setTaskError(friendlySubmitError(err));
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [
      candidateSessionId,
      clearTaskError,
      currentTask,
      refreshTask,
      setTaskError,
      token,
    ],
  );

  return { submitting, handleSubmit };
}
