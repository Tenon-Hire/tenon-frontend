import type { CandidateWorkspaceStatus } from '@/lib/api/candidate';

export type WorkspaceLoadResult = {
  workspace: CandidateWorkspaceStatus | null;
  notice: string | null;
  error: string | null;
  notify?: {
    tone: 'success' | 'warning' | 'error';
    title: string;
    description: string;
  };
};

export const success = (
  workspace: CandidateWorkspaceStatus | null,
): WorkspaceLoadResult => ({
  workspace,
  notice: null,
  error: null,
});

export const refreshed = (
  workspace: CandidateWorkspaceStatus,
  description: string,
): WorkspaceLoadResult => ({
  workspace,
  notice: null,
  error: null,
  notify: {
    tone: 'success',
    title: 'Workspace updated',
    description,
  },
});

export const sessionExpired = (): WorkspaceLoadResult => ({
  workspace: null,
  notice: null,
  error: 'Session expired. Please sign in again.',
  notify: {
    tone: 'warning',
    title: 'Session expired',
    description: 'Session expired. Please sign in again.',
  },
});

export const provisioning = (): WorkspaceLoadResult => ({
  workspace: null,
  notice: 'Workspace repo not provisioned yet. Please try again shortly.',
  error: null,
  notify: {
    tone: 'warning',
    title: 'Workspace still provisioning',
    description: 'Repo/Codespace may take a moment. Hit Refresh in ~15–30s.',
  },
});

export const workspaceError = (
  mode: 'init' | 'refresh',
  message: string,
): WorkspaceLoadResult => ({
  workspace: null,
  notice: null,
  error: message,
  notify: {
    tone: 'error',
    title:
      mode === 'refresh'
        ? 'Workspace couldn’t refresh'
        : 'Workspace not available',
    description: `${message} Use Refresh to try again.`,
  },
});
