import type { CandidateSession } from './types';

export const emptyCandidate: CandidateSession = {
  candidateSessionId: 0,
  inviteEmail: null,
  candidateName: null,
  status: 'not_started',
  startedAt: null,
  completedAt: null,
  hasReport: false,
  verified: null,
  verificationStatus: null,
  dayProgress: null,
  inviteEmailStatus: null,
};

export const buildInviteUrl = (token: string) => {
  const path = `/candidate/session/${token}`;
  if (typeof window === 'undefined' || !window.location?.origin) return path;
  return `${window.location.origin}${path}`;
};

export const normalizeProgress = (
  progress: Record<string, unknown> | number | null,
) => {
  if (progress === null) return null;
  if (typeof progress === 'number') {
    if (!Number.isFinite(progress) || progress <= 0) return null;
    const rounded = Math.round(progress);
    return { current: rounded, total: Math.max(rounded, 1) };
  }
  const current = Number(
    (progress as Record<string, unknown>).current ??
      (progress as Record<string, unknown>).currentDay ??
      (progress as Record<string, unknown>).current_day,
  );
  const total = Number(
    (progress as Record<string, unknown>).total ??
      (progress as Record<string, unknown>).totalDays ??
      (progress as Record<string, unknown>).total_days,
  );
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0)
    return null;
  return {
    current: Math.max(0, Math.round(current)),
    total: Math.round(total),
  };
};
