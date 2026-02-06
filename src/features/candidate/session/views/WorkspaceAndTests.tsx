import { RunTestsPanel } from '../task/components/RunTestsPanel';
import { WorkspacePanel } from '../task/components/WorkspacePanel';
import type { CandidateTask } from '../CandidateSessionProvider';
import type { PollResult } from '../task/hooks/runTestsTypes';

type Props = {
  task: CandidateTask;
  candidateSessionId: number;
  authToken: string | null;
  onStartTests: () => Promise<{ runId: string }>;
  onPollTests: (runId: string) => Promise<PollResult>;
};

export function WorkspaceAndTests({
  task,
  candidateSessionId,
  authToken,
  onStartTests,
  onPollTests,
}: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <WorkspacePanel
        taskId={task.id}
        candidateSessionId={candidateSessionId}
        token={authToken}
        dayIndex={task.dayIndex}
      />
      <RunTestsPanel
        onStart={onStartTests}
        onPoll={onPollTests}
        storageKey={`tenon:taskRun:${task.id}`}
      />
    </div>
  );
}
