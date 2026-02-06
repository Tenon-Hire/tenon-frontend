import type { CandidateWorkspaceStatus } from '@/lib/api/candidate';

export function buildWorkspaceMessage(
  workspace: CandidateWorkspaceStatus | null,
): string {
  const repoReady = Boolean(workspace?.repoUrl || workspace?.repoName);
  const codespaceReady = Boolean(workspace?.codespaceUrl);

  if (!repoReady && !codespaceReady) {
    return 'Workspace provisioning is underway.';
  }
  if (repoReady && !codespaceReady) {
    return 'Repository is ready. Codespace link will appear when ready.';
  }
  if (repoReady && codespaceReady) {
    return 'Workspace is ready.';
  }
  return 'Workspace status is updating.';
}
