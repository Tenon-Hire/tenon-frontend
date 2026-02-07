import { toNumberOrNull, toStringOrNull } from './simUtils';
import type { CandidateSession } from './types';
import {
  buildInviteUrl,
  emptyCandidate,
  normalizeProgress,
} from './candidateNormalizeHelpers';

const resolveCandidateSessionId = (rec: Record<string, unknown>) => {
  const candidates = [
    rec.candidateSessionId,
    rec.candidate_session_id,
    rec.candidateSessionID,
    rec.sessionId,
    rec.session_id,
    rec.candidateId,
    rec.candidate_id,
    rec.id,
  ];
  for (const value of candidates) {
    const parsed = toNumberOrNull(value);
    if (parsed && parsed > 0) return parsed;
  }
  return 0;
};

export const normalizeCandidateSession = (raw: unknown): CandidateSession => {
  if (!raw || typeof raw !== 'object') return emptyCandidate;
  const rec = raw as Record<string, unknown>;
  const candidateSessionId = resolveCandidateSessionId(rec);
  const inviteEmail =
    toStringOrNull(rec.inviteEmail ?? rec.invite_email ?? rec.email) ?? null;
  const candidateName =
    toStringOrNull(rec.candidateName ?? rec.candidate_name ?? rec.name) ?? null;
  let status =
    toStringOrNull(rec.status) ??
    toStringOrNull(rec.sessionStatus ?? rec.session_status) ??
    'not_started';
  const startedAt = toStringOrNull(rec.startedAt ?? rec.started_at);
  const completedAt = toStringOrNull(rec.completedAt ?? rec.completed_at);
  if (completedAt) status = 'completed';
  else if (status === 'not_started' && startedAt) status = 'in_progress';
  const hasReport = rec.hasReport === true || rec.reportReady === true;
  const reportReady =
    rec.reportReady === true || rec.report_ready === true ? true : undefined;
  const reportId =
    toStringOrNull(rec.reportId ?? rec.report_id ?? rec.reportID) ?? undefined;
  const emailVerified =
    rec.email_verified === true || rec.emailVerified === true
      ? true
      : rec.email_verified === false || rec.emailVerified === false
        ? false
        : null;
  const verified =
    rec.verified === true || emailVerified === true
      ? true
      : rec.verified === false || emailVerified === false
        ? false
        : null;
  const verificationStatus =
    toStringOrNull(rec.verificationStatus ?? rec.verification_status) ?? null;
  const progressRaw = (rec.progress ??
    rec.dayProgress ??
    rec.day_progress ??
    rec.progressSummary ??
    rec.progress_summary ??
    null) as Record<string, unknown> | number | null;
  const inviteEmailStatus =
    toStringOrNull(rec.inviteEmailStatus ?? rec.invite_email_status) ?? null;
  const inviteToken =
    toStringOrNull(rec.inviteToken ?? rec.invite_token ?? rec.token) ?? null;
  const rawInviteUrl = toStringOrNull(rec.inviteUrl ?? rec.invite_url);
  const inviteUrl =
    rawInviteUrl ?? (inviteToken ? buildInviteUrl(inviteToken) : undefined);

  return {
    candidateSessionId: candidateSessionId ?? 0,
    inviteEmail,
    candidateName,
    status,
    startedAt,
    completedAt,
    hasReport,
    reportReady,
    reportId,
    verified,
    verificationStatus,
    dayProgress:
      progressRaw && typeof progressRaw === 'object'
        ? (normalizeProgress(progressRaw) as CandidateSession['dayProgress'])
        : normalizeProgress(progressRaw as number | null),
    inviteEmailStatus,
    inviteUrl: inviteUrl ?? undefined,
  };
};
