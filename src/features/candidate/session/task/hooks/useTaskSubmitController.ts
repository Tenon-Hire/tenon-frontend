'use client';
import { useMemo, useState } from 'react';
import { useSubmitHandler, useTaskDrafts } from './taskHooks';
import { isCodeTask, isGithubNativeDay } from '../utils/taskGuards';
import type { SubmitPayload, SubmitResponse, Task } from '../types';

type Args = {
  task: Task;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (
    payload: SubmitPayload,
  ) => Promise<SubmitResponse | void> | SubmitResponse | void;
};

export function useTaskSubmitController({
  task,
  submitting,
  submitError,
  onSubmit,
}: Args) {
  const { textTask, text, setText, savedAt, saveDraftNow, clearDrafts } =
    useTaskDrafts(task);
  const { submitStatus, lastProgress, handleSubmit } =
    useSubmitHandler(onSubmit);
  const [localError, setLocalError] = useState<string | null>(null);

  const githubNative = useMemo(
    () => isGithubNativeDay(task.dayIndex) || isCodeTask(task.type),
    [task.dayIndex, task.type],
  );

  const displayStatus = submitting ? 'submitting' : submitStatus;

  const saveAndSubmit = async () => {
    if (displayStatus !== 'idle') return;

    if (githubNative) {
      setLocalError(null);
      const resp = await handleSubmit({});
      if (resp !== 'submit-failed') clearDrafts();
      return;
    }

    if (textTask) {
      const trimmed = text.trim();
      if (!trimmed) {
        setLocalError('Please enter an answer before submitting.');
        return;
      }
      setLocalError(null);
      const resp = await handleSubmit({ contentText: trimmed });
      if (resp !== 'submit-failed') clearDrafts();
      return;
    }

    setLocalError(null);
    const resp = await handleSubmit({});
    if (resp !== 'submit-failed') clearDrafts();
  };

  const errorToShow = localError ?? submitError ?? null;

  return {
    textTask,
    text,
    setText,
    savedAt,
    saveDraftNow,
    displayStatus,
    lastProgress,
    githubNative,
    disabled: submitting || submitStatus === 'submitted',
    errorToShow,
    saveAndSubmit,
  };
}
