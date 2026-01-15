'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [notice, setNotice] = useState<string | null>(null);
  const initAttemptedRef = useRef(false);

  const loadWorkspace = useCallback(
    async (mode: 'init' | 'refresh') => {
      if (!token) {
        setError('Session expired. Please sign in again.');
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
        setNotice(null);
        let status: CandidateWorkspaceStatus;
        try {
          status = await getCandidateWorkspaceStatus({
            taskId,
            token,
            candidateSessionId,
          });
        } catch (err) {
          const statusCode = toStatus(err);
          if (
            mode === 'init' &&
            statusCode === 404 &&
            !initAttemptedRef.current
          ) {
            initAttemptedRef.current = true;
            const initialized = await initCandidateWorkspace({
              taskId,
              token,
              candidateSessionId,
            });
            setWorkspace(initialized);
            return;
          }
          throw err;
        }
        const needsInit =
          !status.repoUrl && !status.repoName && !status.codespaceUrl;

        if (mode === 'init' && needsInit && !initAttemptedRef.current) {
          initAttemptedRef.current = true;
          const initialized = await initCandidateWorkspace({
            taskId,
            token,
            candidateSessionId,
          });
          setWorkspace(initialized);
        } else {
          setWorkspace(status);
        }
      } catch (err) {
        const status = toStatus(err);
        if (status === 401 || status === 403) {
          setError('Session expired. Please sign in again.');
        } else if (status === 409) {
          setNotice(
            toUserMessage(
              err,
              'Workspace repo not provisioned yet. Please try again.',
            ),
          );
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

  const repoLabel =
    workspace?.repoFullName ?? workspace?.repoName ?? 'Repository';
  const workspaceMessage = buildWorkspaceMessage(workspace);
  const cta = workspace?.codespaceUrl
    ? { href: workspace.codespaceUrl, label: 'Open Codespace' }
    : workspace?.repoUrl
      ? { href: workspace.repoUrl, label: 'Open Repo' }
      : null;

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
          {notice ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
              {notice}
            </div>
          ) : null}
          <div>{workspaceMessage}</div>
          {workspace?.repoName || workspace?.repoFullName ? (
            <div>Repo: {repoLabel}</div>
          ) : null}
          {workspace?.repoUrl ? (
            <div className="text-xs text-gray-600">
              Repo URL: {workspace.repoUrl}
            </div>
          ) : null}
          {cta ? (
            <a
              className="block text-blue-600 hover:underline"
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {cta.label}
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
