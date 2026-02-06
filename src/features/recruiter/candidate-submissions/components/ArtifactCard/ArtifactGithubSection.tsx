'use client';
import { Field } from './Field';

type Props = {
  repoFullName: string | null;
  repoUrl: string | null;
  repoPath: string | null;
  repoLinkLabel?: string | null;
  workflowUrl: string | null;
  commitUrl: string | null;
  diffUrl: string | null;
  diffSummaryText: string | null;
  hasTestResults: boolean;
};

export function ArtifactGithubSection({
  repoFullName,
  repoUrl,
  repoPath,
  repoLinkLabel,
  workflowUrl,
  commitUrl,
  diffUrl,
  diffSummaryText,
  hasTestResults,
}: Props) {
  return (
    <>
      <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
        <Field
          label="Repository"
          value={repoFullName ?? repoUrl ?? repoPath ?? null}
          link={repoUrl}
          linkLabel={repoLinkLabel ?? undefined}
        />
        <Field
          label="Workflow"
          value={workflowUrl}
          link={workflowUrl}
          linkLabel="Workflow run"
        />
        <Field
          label="Commit"
          value={commitUrl}
          link={commitUrl}
          linkLabel="Commit"
        />
        <Field label="Diff" value={diffUrl} link={diffUrl} linkLabel="Diff" />
        <Field label="Diff summary" value={diffSummaryText} />
      </div>
      {hasTestResults ? null : (
        <div className="mt-2 text-xs text-gray-600">
          No GitHub test results captured yet.
        </div>
      )}
    </>
  );
}
