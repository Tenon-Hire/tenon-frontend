import {
  toCandidateSessionId,
  toDateString,
  toNumberOrNull,
  toStringOrNull,
} from './base';
import type { CandidateInvite } from './types';
import { extractInviteToken } from '../dashboard/utils/inviteTokens';

// Size guardrail: extra normalization cases + invite token parsing.
const normalizeProgress = (
  raw: unknown,
): { completed: number; total: number } | null => {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const completed =
    toNumberOrNull(rec.completed) ??
    toNumberOrNull(rec.completedTasks) ??
    toNumberOrNull(rec.completed_tasks);
  const total =
    toNumberOrNull(rec.total) ??
    toNumberOrNull(rec.totalTasks) ??
    toNumberOrNull(rec.total_tasks);
  if (completed === null || total === null) return null;
  return { completed, total };
};

export function normalizeCandidateInvite(raw: unknown): CandidateInvite {
  const candidateSessionId = toCandidateSessionId(
    (raw as { candidateSessionId?: unknown })?.candidateSessionId ??
      (raw as { candidate_session_id?: unknown })?.candidate_session_id ??
      (raw as { id?: unknown })?.id,
  );

  const title =
    toStringOrNull((raw as { title?: unknown }).title) ??
    toStringOrNull((raw as { simulationTitle?: unknown }).simulationTitle) ??
    'Simulation invite';

  const role =
    toStringOrNull((raw as { role?: unknown }).role) ??
    toStringOrNull((raw as { roleName?: unknown }).roleName) ??
    toStringOrNull((raw as { role_name?: unknown }).role_name) ??
    'Role pending';

  const companyValue =
    toStringOrNull((raw as { company?: unknown }).company) ??
    toStringOrNull((raw as { companyName?: unknown }).companyName) ??
    toStringOrNull((raw as { company_name?: unknown }).company_name);

  const rawInviteUrl =
    toStringOrNull((raw as { inviteUrl?: unknown }).inviteUrl) ??
    toStringOrNull((raw as { invite_url?: unknown }).invite_url);
  const token =
    toStringOrNull((raw as { token?: unknown }).token) ??
    toStringOrNull((raw as { inviteToken?: unknown }).inviteToken) ??
    toStringOrNull((raw as { invite_token?: unknown }).invite_token) ??
    (rawInviteUrl ? extractInviteToken(rawInviteUrl) : null);
  const status =
    toStringOrNull((raw as { status?: unknown }).status) ??
    toStringOrNull((raw as { sessionStatus?: unknown }).sessionStatus) ??
    'in_progress';

  const progress =
    normalizeProgress((raw as { progress?: unknown })?.progress) ??
    normalizeProgress(
      (raw as { progressSummary?: unknown })?.progressSummary,
    ) ??
    normalizeProgress(
      (raw as { progress_summary?: unknown })?.progress_summary,
    );

  const expiresAt =
    toDateString((raw as { expiresAt?: unknown })?.expiresAt) ??
    toDateString((raw as { expires_at?: unknown })?.expires_at) ??
    toDateString((raw as { expiryDate?: unknown })?.expiryDate) ??
    toDateString((raw as { expiry_date?: unknown })?.expiry_date) ??
    null;

  const lastActivityAt =
    toDateString((raw as { lastActivityAt?: unknown })?.lastActivityAt) ??
    toDateString((raw as { last_activity_at?: unknown })?.last_activity_at) ??
    toDateString((raw as { updatedAt?: unknown })?.updatedAt) ??
    toDateString((raw as { updated_at?: unknown })?.updated_at) ??
    null;

  const isExpired =
    (raw as { isExpired?: unknown })?.isExpired === true ||
    (raw as { is_expired?: unknown })?.is_expired === true ||
    status === 'expired';

  return {
    candidateSessionId: Number.isFinite(candidateSessionId)
      ? (candidateSessionId as number)
      : 0,
    token: token ?? null,
    title,
    role,
    company: companyValue && companyValue.trim() ? companyValue : null,
    status,
    progress,
    expiresAt,
    lastActivityAt,
    isExpired,
  };
}
