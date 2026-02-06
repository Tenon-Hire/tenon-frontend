'use client';
import { InlineBadge } from '@/components/ui/InlineBadge';
import type { StatusTone } from '@/features/shared/formatters';
import type { SubmissionArtifact } from '../../types';

type Props = {
  artifact: SubmissionArtifact;
  status: { label: string; tone: StatusTone };
  submittedAt: string | null;
};

export function ArtifactHeader({ artifact, status, submittedAt }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-gray-900">
          Day {artifact.task.dayIndex}: {artifact.task.title}
        </div>
        <div className="mt-1 text-xs text-gray-500">
          {artifact.task.type} •{' '}
          {submittedAt ? `submitted ${submittedAt}` : 'submission time N/A'}
        </div>
      </div>
      {artifact.testResults ? (
        <InlineBadge label={status.label} tone={status.tone} />
      ) : null}
    </div>
  );
}
