'use client';
import Button from '@/shared/ui/Button';
import { ArtifactCard } from './ArtifactCard';
import type { SubmissionArtifact, SubmissionListItem } from '../types';

type Props = {
  items: SubmissionListItem[];
  totalCount: number;
  artifacts: Record<number, SubmissionArtifact>;
  page: number;
  totalPages: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
};

export function SubmissionsTable({
  items,
  totalCount,
  artifacts,
  page,
  totalPages,
  pageSize,
  onPrev,
  onNext,
}: Props) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalCount, (page - 1) * pageSize + items.length);
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">
          All submissions
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            Showing {start}–{end}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onPrev}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-xs text-gray-700">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onNext}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {items.map((it) => {
          const artifact = artifacts[it.submissionId];
          if (!artifact) {
            return (
              <div
                key={it.submissionId}
                className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700"
              >
                Day {it.dayIndex} ({it.type}) — submission #{it.submissionId}{' '}
                content not available.
              </div>
            );
          }
          return <ArtifactCard key={it.submissionId} artifact={artifact} />;
        })}
      </div>
    </div>
  );
}
