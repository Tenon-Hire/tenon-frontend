'use client';

import { useState } from 'react';
import {
  useSubmitHandler,
  useTaskDrafts,
} from '@/features/candidate/task/hooks';
import { Task, SubmitPayload, SubmitResponse } from './types';
import { TaskContainer } from './components/TaskContainer';
import { TaskHeader } from './components/TaskHeader';
import { TaskDescription } from './components/TaskDescription';
import { TaskCodeInput } from './components/TaskCodeInput';
import { TaskTextInput } from './components/TaskTextInput';
import { TaskStatus } from './components/TaskStatus';
import { TaskErrorBanner } from './components/TaskErrorBanner';
import { TaskActions } from './components/TaskActions';

export default function TaskView(props: {
  task: Task;
  candidateSessionId: number;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (
    payload: SubmitPayload,
  ) => Promise<SubmitResponse | void> | SubmitResponse | void;
}) {
  return <TaskViewInner key={props.task.id} {...props} />;
}

function TaskViewInner({
  task,
  candidateSessionId,
  onSubmit,
  submitting,
  submitError,
}: {
  task: Task;
  candidateSessionId: number;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (
    payload: SubmitPayload,
  ) => Promise<SubmitResponse | void> | SubmitResponse | void;
}) {
  const {
    codeTask,
    textTask,
    text,
    setText,
    code,
    setCode,
    savedAt,
    saveDraftNow,
    clearDrafts,
  } = useTaskDrafts(task, candidateSessionId);

  const { submitStatus, lastProgress, handleSubmit } =
    useSubmitHandler(onSubmit);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayStatus = submitting ? 'submitting' : submitStatus;

  const saveAndSubmit = async () => {
    if (displayStatus !== 'idle') return;

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

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setLocalError('Please write some code before submitting.');
      return;
    }

    setLocalError(null);
    const resp = await handleSubmit({ codeBlob: code });
    if (resp !== 'submit-failed') clearDrafts();
  };

  const errorToShow = localError ?? submitError ?? null;

  return (
    <TaskContainer>
      <TaskHeader task={task} />
      <TaskDescription description={task.description} />

      <div className="mt-6">
        {codeTask ? (
          <TaskCodeInput code={code} onChange={setCode} />
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
