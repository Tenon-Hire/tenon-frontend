import CandidateTaskView from '../../task/CandidateTaskView';
import { TaskFallback } from '../TaskFallback';
import type { CandidateTask } from '../../CandidateSessionProvider';
import type { SubmitPayload, SubmitResponse } from '../../task/types';

type Props = {
  currentTask: CandidateTask | null;
  candidateSessionId: number | null;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (
    payload: SubmitPayload,
  ) => Promise<SubmitResponse | void> | SubmitResponse | void;
  onRetryTask: () => void;
  onDashboard: () => void;
};

export function TaskSection({
  currentTask,
  candidateSessionId,
  submitting,
  submitError,
  onSubmit,
  onRetryTask,
  onDashboard,
}: Props) {
  if (currentTask && candidateSessionId !== null) {
    return (
      <CandidateTaskView
        task={currentTask}
        submitting={submitting}
        submitError={submitError}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <TaskFallback
      hasTask={Boolean(currentTask)}
      onRetry={onRetryTask}
      onDashboard={onDashboard}
    />
  );
}
