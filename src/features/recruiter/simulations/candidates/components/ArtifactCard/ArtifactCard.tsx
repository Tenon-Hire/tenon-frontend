'use client';
import { useMemo, useState } from 'react';
import type { SubmissionArtifact } from '../../types';
import {
  deriveRepoInfo,
  formatDateTime,
  hasContent,
  shouldShowGithubSection,
} from '../../utils/formatters';
import { deriveTestStatus } from '@/shared/formatters';
import { ArtifactHeader } from './ArtifactHeader';
import { ArtifactGithubSection } from './ArtifactGithubSection';
import { ArtifactTestResults } from './ArtifactTestResults';
import { ArtifactTextAnswer } from './ArtifactTextAnswer';
import { formatDiffSummary } from './artifactUtils';

type Props = { artifact: SubmissionArtifact; repoLinkLabel?: string | null };

export function ArtifactCard({ artifact, repoLinkLabel }: Props) {
  const { repoUrl, repoFullName } = deriveRepoInfo(artifact);
  const workflowUrl =
    artifact.workflowUrl ?? artifact.testResults?.workflowUrl ?? null;
  const commitUrl =
    artifact.commitUrl ?? artifact.testResults?.commitUrl ?? null;
  const diffSummaryText = formatDiffSummary(artifact.diffSummary);
  const submittedAt = formatDateTime(artifact.submittedAt);
  const status = deriveTestStatus(artifact.testResults);
  const hasText = hasContent(artifact.contentText);
  const showGithub = shouldShowGithubSection(artifact);

  const [expanded, setExpanded] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const previewText = useMemo(() => {
    if (!hasText) return null;
    const text = (artifact.contentText as string).trim();
    if (expanded || text.length <= 300) return text;
    return `${text.slice(0, 300)}…`;
  }, [artifact.contentText, expanded, hasText]);

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <ArtifactHeader
        artifact={artifact}
        status={status}
        submittedAt={submittedAt}
      />

      {showGithub && (
        <ArtifactGithubSection
          repoFullName={repoFullName}
          repoUrl={repoUrl}
          repoPath={artifact.code?.repoPath ?? null}
          repoLinkLabel={repoLinkLabel}
          workflowUrl={workflowUrl}
          commitUrl={commitUrl}
          diffUrl={artifact.diffUrl ?? null}
          diffSummaryText={diffSummaryText}
          hasTestResults={Boolean(artifact.testResults)}
        />
      )}

      {artifact.testResults ? (
        <ArtifactTestResults
          testResults={artifact.testResults}
          showOutput={showOutput}
          onToggleOutput={() => setShowOutput((v) => !v)}
        />
      ) : null}

      {artifact.task.prompt ? (
        <ArtifactTextAnswer.Prompt value={artifact.task.prompt} />
      ) : null}

      {hasText ? (
        <ArtifactTextAnswer.Text
          expanded={expanded}
          previewText={previewText}
          content={artifact.contentText as string}
          onToggle={() => setExpanded((v) => !v)}
        />
      ) : (
        <ArtifactTextAnswer.Empty
          showGithub={showGithub}
          taskType={artifact.task.type}
        />
      )}
    </div>
  );
}
