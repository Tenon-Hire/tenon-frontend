import { RunningIntroSection } from './components/RunningIntroSection';
import { RunningPanelsSection } from './components/RunningPanelsSection';
import type { CandidateTask } from '../CandidateSessionProvider';
import type { SubmitPayload, SubmitResponse } from '../task/types';
import type { PollResult } from '../task/hooks/runTestsTypes';

type Props = {
  title: string;
  role: string;
  completedCount: number;
  currentDayIndex: number;
  currentTask: CandidateTask | null;
  candidateSessionId: number | null;
  authToken: string | null;
  taskError: string | null;
  taskLoading: boolean;
  resourceLink: string | null;
  submitting: boolean;
  showWorkspacePanel: boolean;
  showRecordingPanel: boolean;
  showDocsPanel: boolean;
  onRetryTask: () => void;
  onSubmit: (
    payload: SubmitPayload,
  ) => Promise<SubmitResponse | void> | SubmitResponse | void;
  onStartTests: () => Promise<{ runId: string }>;
  onPollTests: (runId: string) => Promise<PollResult>;
  onDashboard: () => void;
};

export function RunningView({
  title,
  role,
  completedCount,
  currentDayIndex,
  currentTask,
  candidateSessionId,
  authToken,
  taskError,
  taskLoading,
  resourceLink,
  submitting,
  showWorkspacePanel,
  showRecordingPanel,
  showDocsPanel,
  onRetryTask,
  onSubmit,
  onStartTests,
  onPollTests,
  onDashboard,
}: Props) {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <RunningIntroSection
        title={title}
        role={role}
        taskLoading={taskLoading}
        completedCount={completedCount}
        currentDayIndex={currentDayIndex}
        currentTaskTitle={currentTask?.title ?? null}
        taskError={taskError}
        onRetryTask={onRetryTask}
      />

      <RunningPanelsSection
        currentTask={currentTask}
        candidateSessionId={candidateSessionId}
        authToken={authToken}
        resourceLink={resourceLink}
        submitting={submitting}
        showWorkspacePanel={showWorkspacePanel}
        showRecordingPanel={showRecordingPanel}
        showDocsPanel={showDocsPanel}
        taskError={taskError}
        onSubmit={onSubmit}
        onRetryTask={onRetryTask}
        onStartTests={onStartTests}
        onPollTests={onPollTests}
        onDashboard={onDashboard}
      />
    </div>
  );
}
