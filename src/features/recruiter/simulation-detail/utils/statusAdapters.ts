import { statusMeta } from '@/features/shared/status/statusMeta';
import type { CandidateSession } from '@/types/recruiter';
import { deriveStatus, formatDayProgress } from './formatters';

export const reportStatusMeta = (candidate: CandidateSession) => {
  const ready =
    candidate.hasReport || candidate.reportReady || Boolean(candidate.reportId);
  return ready
    ? statusMeta('report_ready')
    : { label: '—', tone: 'muted' as const };
};

export const dayProgressStatusMeta = (candidate: CandidateSession) => {
  const label = formatDayProgress(candidate.dayProgress ?? null);
  const base = statusMeta(deriveStatus(candidate));
  if (!label) return { label: '—', tone: 'muted' as const };
  return { label, tone: base.tone };
};
