'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import {
  getCandidateWorkspaceStatus,
  initCandidateWorkspace,
  type CandidateWorkspaceStatus,
} from '@/lib/api/candidate';
import { toStatus, toUserMessage } from '@/lib/utils/errors';

type WorkspacePanelProps = {
  taskId: number;
  candidateSessionId: number;
  token: string | null;
  dayIndex: number;
};

function buildWorkspaceMessage(workspace: CandidateWorkspaceStatus | null) {
  const repoReady = Boolean(workspace?.repoUrl || workspace?.repoName);
  const codespaceReady = Boolean(workspace?.codespaceUrl);

  if (!repoReady && !codespaceReady) {
    return 'Workspace provisioning is underway. Check back in a moment.';
  }
  if (repoReady && !codespaceReady) {
    return 'Repository is ready. Codespace is still provisioning.';
  }
  if (repoReady && codespaceReady) {
    return 'Workspace is ready.';
  }
  return 'Workspace status is updating.';
}

export function WorkspacePanel({
  taskId,
  candidateSessionId,
  token,
  dayIndex,
}: WorkspacePanelProps) {
  const [workspace, setWorkspace] = useState<CandidateWorkspaceStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(
    async (mode: 'init' | 'refresh') => {
      if (!token) {
        setError('Session expired. Please verify your invite again.');
        setLoading(false);
        return;
      }

      try {
        if (mode === 'init') {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);

        const data =
          mode === 'init'
            ? await initCandidateWorkspace({
                taskId,
                token,
                candidateSessionId,
              })
            : await getCandidateWorkspaceStatus({
                taskId,
                token,
                candidateSessionId,
              });

        setWorkspace(data);
      } catch (err) {
        const status = toStatus(err);
        if (status === 401 || status === 403) {
          setError('Session expired. Please verify your invite again.');
        } else {
          setError(
            toUserMessage(err, 'Unable to load your workspace right now.'),
          );
        }
      } finally {
        if (mode === 'init') {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [candidateSessionId, taskId, token],
  );

  useEffect(() => {
    void loadWorkspace('init');
  }, [loadWorkspace]);

  const repoLabel = workspace?.repoName ?? 'View repository';
  const workspaceMessage = buildWorkspaceMessage(workspace);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Day {dayIndex} workspace
          </div>
          <div className="text-xs text-gray-600">
            Provisioned GitHub repo + Codespace link.
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => void loadWorkspace('refresh')}
          disabled={loading || refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="mt-3 text-sm text-gray-600">Loading workspace…</div>
      ) : error ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-sm text-gray-700">
          <div>{workspaceMessage}</div>
          {workspace?.repoUrl ? (
            <a
              className="block text-blue-600 hover:underline"
              href={workspace.repoUrl}
              target="_blank"
              rel="noreferrer"
            >
              {repoLabel}
            </a>
          ) : workspace?.repoName ? (
            <div>{repoLabel}</div>
          ) : null}
          {workspace?.codespaceUrl ? (
            <a
              className="block text-blue-600 hover:underline"
              href={workspace.codespaceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open codespace
            </a>
          ) : (
            <div className="text-xs text-gray-500">
              Codespace link will appear when ready.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
