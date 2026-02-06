'use client';
import { useWorkspaceStatus } from '../hooks/useWorkspaceStatus';
import { buildWorkspaceMessage } from '../utils/workspaceMessages';
import { WorkspacePanelHeader } from './WorkspacePanelHeader';
import { WorkspacePanelBody } from './WorkspacePanelBody';

type WorkspacePanelProps = {
  taskId: number;
  candidateSessionId: number;
  token: string | null;
  dayIndex: number;
};

export function WorkspacePanel(props: WorkspacePanelProps) {
  const { dayIndex } = props;
  const { workspace, loading, refreshing, error, notice, refresh } =
    useWorkspaceStatus(props);

  const workspaceMessage = buildWorkspaceMessage(workspace);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <WorkspacePanelHeader
        dayIndex={dayIndex}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
      />
      <WorkspacePanelBody
        workspace={workspace}
        loading={loading}
        error={error}
        notice={notice}
        refreshing={refreshing}
        onRefresh={refresh}
        message={workspaceMessage}
      />
    </div>
  );
}
