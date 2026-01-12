'use client';

import { useState } from 'react';
import { useSubmitHandler, useTaskDrafts } from './hooks/taskHooks';
import { Task, SubmitPayload, SubmitResponse } from './types';
import { TaskContainer } from './components/TaskContainer';
import { TaskHeader } from './components/TaskHeader';
import { TaskDescription } from './components/TaskDescription';
import { TaskTextInput } from './components/TaskTextInput';
import { TaskStatus } from './components/TaskStatus';
import { TaskErrorBanner } from './components/TaskErrorBanner';
import { TaskActions } from './components/TaskActions';
import { isCodeTask, isGithubNativeDay } from './utils/taskGuards';

export default function CandidateTaskView(props: {
  task: Task;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (
    payload: SubmitPayload,
  ) => Promise<SubmitResponse | void> | SubmitResponse | void;
}) {
  return <CandidateTaskViewInner key={props.task.id} {...props} />;
}

function CandidateTaskViewInner({
  task,
  onSubmit,
  submitting,
  submitError,
}: {
  task: Task;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (
    payload: SubmitPayload,
  ) => Promise<SubmitResponse | void> | SubmitResponse | void;
}) {
  const { textTask, text, setText, savedAt, saveDraftNow, clearDrafts } =
    useTaskDrafts(task);

  const { submitStatus, lastProgress, handleSubmit } =
    useSubmitHandler(onSubmit);
  const [localError, setLocalError] = useState<string | null>(null);
  const githubNative =
    isGithubNativeDay(task.dayIndex) || isCodeTask(task.type);

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

  return (
    <TaskContainer>
      <TaskHeader task={task} />
      <TaskDescription description={task.description} />

      <div className="mt-6">
        {githubNative ? (
          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            Work in your GitHub repository or Codespace. When you’re ready,
            submit to move to the next day.
          </div>
        ) : (
          <TaskTextInput
            value={text}
            onChange={setText}
            disabled={submitting || submitStatus === 'submitted'}
            savedAt={savedAt}
          />
        )}
      </div>

      <TaskStatus displayStatus={displayStatus} progress={lastProgress} />
      <TaskErrorBanner message={errorToShow} />

      <TaskActions
        isTextTask={textTask}
        displayStatus={displayStatus}
        onSaveDraft={textTask ? saveDraftNow : undefined}
        onSubmit={saveAndSubmit}
      />
    </TaskContainer>
  );
}
