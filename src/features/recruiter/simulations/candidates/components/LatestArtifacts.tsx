'use client';
import { ArtifactCard } from './ArtifactCard';
import type { SubmissionArtifact } from '../types';

type Props = {
  day2: SubmissionArtifact | null;
  day3: SubmissionArtifact | null;
};

export function LatestArtifacts({ day2, day3 }: Props) {
  const hasLatest = Boolean(day2 || day3);
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="text-sm font-semibold text-gray-900">
        Latest GitHub artifacts (Day 2 / Day 3)
      </div>
      <div className="text-xs text-gray-600">
        Shows the newest Day 2 and Day 3 submissions by submitted time.
      </div>
      <div className="mt-3 flex flex-col gap-3 md:grid md:grid-cols-2">
        <Slot label="Day 2" artifact={day2} />
        <Slot label="Day 3" artifact={day3} />
      </div>
      {!hasLatest ? (
        <div className="mt-2 text-xs text-gray-600">
          Day 2 / Day 3 artifacts will appear after the candidate submits code.
        </div>
      ) : null}
    </div>
  );
}

const Slot = ({
  label,
  artifact,
}: {
  label: string;
  artifact: SubmissionArtifact | null;
}) => {
  if (!artifact) return <Placeholder label={label} />;
  return <ArtifactCard artifact={artifact} />;
};

const Placeholder = ({ label }: { label: string }) => (
  <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
    {label} submission not available.
  </div>
);
