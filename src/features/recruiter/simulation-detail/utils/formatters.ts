import { formatDateTime } from '@/features/shared/formatters';
import { statusMeta } from '@/features/shared/status/statusMeta';
import type { CandidateSession } from '@/types/recruiter';

export type DerivedStatus = 'completed' | 'in_progress' | 'not_started';

export { formatDateTime };

export const inviteStatusMeta = (
  status: CandidateSession['inviteEmailStatus'],
) => statusMeta(status ?? 'not_sent', 'Not sent');

export const inviteStatusLabel = (
  status: CandidateSession['inviteEmailStatus'],
) => inviteStatusMeta(status).label;

export const verificationStatusMeta = (candidate: CandidateSession) => {
  const status = (candidate as { verificationStatus?: unknown })
    .verificationStatus;
  if (candidate.verifiedAt || candidate.verified) {
    return statusMeta('verified');
  }
  if (typeof status === 'string' && status.trim()) {
    if (status.toLowerCase() === 'failed')
      return statusMeta('verification_failed', 'Failed');
    return statusMeta(status, 'Not verified');
  }
  if (candidate.verified === false) return statusMeta('not_verified');
  return statusMeta('not_verified');
};

export const verificationStatusLabel = (candidate: CandidateSession) =>
  verificationStatusMeta(candidate).label;

export function formatDayProgress(
  dayProgress:
    | number
    | { current?: number | string; total?: number | string }
    | null,
): string | null {
  if (dayProgress === null || dayProgress === undefined) return null;
  if (typeof dayProgress === 'number') {
    if (!Number.isFinite(dayProgress) || dayProgress <= 0) return null;
    return `${Math.round(dayProgress)} / ${Math.round(dayProgress)}`;
  }
  const current = Number((dayProgress as { current?: unknown }).current ?? 0);
  const total = Number((dayProgress as { total?: unknown }).total ?? 0);
  if (!Number.isFinite(total) || total <= 0) return null;
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;
  return `${Math.round(safeCurrent)} / ${Math.round(total)}`;
}

export function formatCooldown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Retry soon';
  const sec = Math.max(1, Math.ceil(ms / 1000));
  return `Retry in ${sec}s`;
}

export function toTimestamp(value: string | null): number {
  if (!value) return 0;
  const date = new Date(value);
  return date.getTime() || 0;
}

export function deriveStatus(candidate: CandidateSession): DerivedStatus {
  if (candidate.completedAt || candidate.hasReport || candidate.reportReady)
    return 'completed';
  if (candidate.startedAt || candidate.dayProgress) return 'in_progress';
  return 'not_started';
}
