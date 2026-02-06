import CandidateTaskProgress from '../../task/CandidateTaskProgress';
import { TaskErrorBanner } from '../TaskErrorBanner';
import { RunningHeader } from './RunningHeader';

type Props = {
  title: string;
  role: string;
  taskLoading: boolean;
  completedCount: number;
  currentDayIndex: number;
  currentTaskTitle: string | null;
  taskError: string | null;
  onRetryTask: () => void;
};

export function RunningIntroSection({
  title,
  role,
  taskLoading,
  completedCount,
  currentDayIndex,
  currentTaskTitle,
  taskError,
  onRetryTask,
}: Props) {
  return (
    <>
      <RunningHeader title={title} role={role} taskLoading={taskLoading} />
      <CandidateTaskProgress
        completedCount={completedCount}
        currentDayIndex={currentDayIndex}
        currentTaskTitle={currentTaskTitle}
      />
      <TaskErrorBanner message={taskError} onRetry={onRetryTask} />
    </>
  );
}
