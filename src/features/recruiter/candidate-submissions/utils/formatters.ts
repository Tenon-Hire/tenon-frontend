import { formatDateTime } from '@/features/shared/formatters';
import type { SubmissionArtifact } from '../types';

export { formatDateTime };

export function hasContent(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function deriveRepoInfo(artifact: SubmissionArtifact) {
  const code =
    artifact.code && typeof artifact.code === 'object' ? artifact.code : null;
  const repoPathAsFullName =
    (artifact.task.dayIndex === 2 || artifact.task.dayIndex === 3) &&
    typeof code?.repoPath === 'string' &&
    !code.repoPath.includes('http')
      ? code.repoPath
      : null;
  const repoFullName =
    artifact.repoFullName ?? code?.repoFullName ?? repoPathAsFullName ?? null;
  const repoUrlExplicit =
    artifact.repoUrl ??
    code?.repoUrl ??
    (typeof code?.repoPath === 'string' && code.repoPath.includes('http')
      ? code.repoPath
      : null) ??
    null;
  const repoUrl =
    repoUrlExplicit ??
    (repoFullName && repoFullName.includes('/')
      ? `https://github.com/${repoFullName}`
      : null);
  return { repoUrl, repoFullName };
}

export const shouldShowGithubSection = (artifact: SubmissionArtifact) => {
  const day = artifact.task.dayIndex;
  const hasGithub =
    artifact.repoUrl ||
    artifact.repoFullName ||
    artifact.workflowUrl ||
    artifact.commitUrl ||
    artifact.diffUrl ||
    artifact.diffSummary ||
    artifact.testResults?.workflowUrl ||
    artifact.testResults?.commitUrl;
  return day === 2 || day === 3 || Boolean(hasGithub);
};
