import { WorkspaceAndTests } from '../WorkspaceAndTests';
import type { CandidateTask } from '../../CandidateSessionProvider';
import type { PollResult } from '../../task/hooks/runTestsTypes';

type Props = {
  task: CandidateTask | null;
  candidateSessionId: number | null;
  authToken: string | null;
  showWorkspacePanel: boolean;
  onStartTests: () => Promise<{ runId: string }>;
  onPollTests: (runId: string) => Promise<PollResult>;
};

export function WorkspaceSection({
  task,
  candidateSessionId,
  authToken,
  showWorkspacePanel,
  onStartTests,
  onPollTests,
}: Props) {
  if (!showWorkspacePanel || candidateSessionId === null || !task) return null;
  return (
    <WorkspaceAndTests
      task={task}
      candidateSessionId={candidateSessionId}
      authToken={authToken}
      onStartTests={onStartTests}
      onPollTests={onPollTests}
    />
  );
}
