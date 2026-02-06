import { submitCandidateTask } from '@/lib/api/candidate';
import { useNotifications } from '@/features/shared/notifications';
import { normalizeApiError } from '@/lib/utils/errors';
import { friendlySubmitError } from '../utils/errorMessages';
import {
  isCodeTask,
  isGithubNativeDay,
  isTextTask,
} from '../task/utils/taskGuards';
import type { Task, SubmitPayload } from '../task/types';

type Deps = {
  token: string | null;
  candidateSessionId: number | null;
  currentTask: Task | null;
  clearTaskError: () => void;
  setTaskError: (msg: string) => void;
  refreshTask: (opts?: { skipCache?: boolean }) => Promise<void>;
  setSubmitting: (v: boolean) => void;
  setRefreshTimer: (cb: () => void) => void;
};

export function useTaskSubmitHandler({
  token,
  candidateSessionId,
  currentTask,
  clearTaskError,
  setTaskError,
  refreshTask,
  setSubmitting,
  setRefreshTimer,
}: Deps) {
  const { notify } = useNotifications();

  const handleSubmit = async (payload: SubmitPayload) => {
    if (!token || !candidateSessionId || !currentTask) return;

    const type = String(currentTask.type);
    const wantsText = isTextTask(type);
    const isCode = isCodeTask(type);
    const isGithubNative = isGithubNativeDay(currentTask.dayIndex) || isCode;

    if (!isGithubNative && wantsText) {
      const trimmed = (payload.contentText ?? '').trim();
      if (!trimmed) {
        setTaskError('Please enter an answer before submitting.');
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
        contentText: isGithubNative ? undefined : payload.contentText,
      });

      setRefreshTimer(() => {
        void refreshTask({ skipCache: true });
      });

      notify({
        id: `submit-${currentTask.id}`,
        tone: 'success',
        title: 'Submission received',
        description: 'We are refreshing your progress.',
      });

      return resp;
    } catch (err) {
      const normalized = normalizeApiError(
        err,
        friendlySubmitError(err) ?? 'Submission failed.',
      );
      setTaskError(normalized.message);
      notify({
        id: `submit-${currentTask?.id ?? 'unknown'}`,
        tone: 'error',
        title: 'Submission failed',
        description: normalized.message,
      });
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return { handleSubmit };
}
