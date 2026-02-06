import { statusMeta } from '@/shared/status/statusMeta';
import type { CandidateSession } from '@/features/recruiter/types';
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
