import { TaskSection } from './TaskSection';
import { WorkspaceSection } from '../sections/WorkspaceSection';
import { ResourceSections } from '../ResourceSections';
import type { CandidateTask } from '../../CandidateSessionProvider';
import type { SubmitPayload, SubmitResponse } from '../../task/types';
import type { PollResult } from '../../task/hooks/runTestsTypes';

type Props = {
  currentTask: CandidateTask | null;
  candidateSessionId: number | null;
  authToken: string | null;
  resourceLink: string | null;
  submitting: boolean;
  showWorkspacePanel: boolean;
  showRecordingPanel: boolean;
  showDocsPanel: boolean;
  taskError: string | null;
  onSubmit: (
    payload: SubmitPayload,
  ) => Promise<SubmitResponse | void> | SubmitResponse | void;
  onRetryTask: () => void;
  onStartTests: () => Promise<{ runId: string }>;
  onPollTests: (runId: string) => Promise<PollResult>;
  onDashboard: () => void;
};

export function RunningPanelsSection({
  currentTask,
  candidateSessionId,
  authToken,
  resourceLink,
  submitting,
  showWorkspacePanel,
  showRecordingPanel,
  showDocsPanel,
  taskError,
  onSubmit,
  onRetryTask,
  onStartTests,
  onPollTests,
  onDashboard,
}: Props) {
  return (
    <>
      <WorkspaceSection
        task={currentTask}
        candidateSessionId={candidateSessionId}
        authToken={authToken}
        showWorkspacePanel={showWorkspacePanel}
        onStartTests={onStartTests}
        onPollTests={onPollTests}
      />

      <ResourceSections
        showRecording={showRecordingPanel}
        showDocs={showDocsPanel}
        resourceLink={resourceLink}
      />

      <TaskSection
        currentTask={currentTask}
        candidateSessionId={candidateSessionId}
        submitting={submitting}
        submitError={taskError}
        onSubmit={onSubmit}
        onRetryTask={onRetryTask}
        onDashboard={onDashboard}
      />
    </>
  );
}
