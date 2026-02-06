import type { SubmissionListItem } from '../types';

export const pickLatestByDay = (items: SubmissionListItem[], day: number) => {
  const candidates = items.filter((it) => Number(it.dayIndex) === day);
  if (!candidates.length) return null;
  return candidates.reduce<SubmissionListItem | null>((best, cand) => {
    if (!best) return cand;
    const candTs = Date.parse(cand.submittedAt ?? '');
    const bestTs = Date.parse(best.submittedAt ?? '');
    const candValid = !Number.isNaN(candTs);
    const bestValid = !Number.isNaN(bestTs);
    if (candValid && bestValid) return candTs > bestTs ? cand : best;
    if (candValid && !bestValid) return cand;
    if (!candValid && !bestValid && cand.submissionId > best.submissionId)
      return cand;
    return best;
  }, null);
};
