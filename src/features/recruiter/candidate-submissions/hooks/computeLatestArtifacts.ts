import type { SubmissionArtifact, SubmissionListItem } from '../types';

export function computeLatestArtifacts(
  items: SubmissionListItem[],
  artifacts: Record<number, SubmissionArtifact>,
) {
  const latest2 = items
    .filter((it) => it.dayIndex === 2)
    .sort((a, b) => b.submissionId - a.submissionId)[0];
  const latest3 = items
    .filter((it) => it.dayIndex === 3)
    .sort((a, b) => b.submissionId - a.submissionId)[0];
  return {
    latestDay2: latest2 ? (artifacts[latest2.submissionId] ?? null) : null,
    latestDay3: latest3 ? (artifacts[latest3.submissionId] ?? null) : null,
  };
}
