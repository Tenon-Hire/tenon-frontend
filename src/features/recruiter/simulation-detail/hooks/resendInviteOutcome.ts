import { inviteStatusLabel } from '../utils/formatters';
import type { CandidateSession } from '@/types/recruiter';
import type { ResendInviteResult } from '@/lib/api/recruiter/types';

export type ResendOutcome =
  | { type: 'notFound' }
  | { type: 'rateLimited'; retryAfter: number | null }
  | { type: 'error'; message: string }
  | {
      type: 'success';
      candidate: CandidateSession | null;
      rateLimited: boolean;
      retryAfter: number | null;
      statusMessage: string;
    };

export const toResendOutcome = (
  res: ResendInviteResult,
  normalized: CandidateSession | null,
): ResendOutcome => {
  if (res.notFound) return { type: 'notFound' };
  if (!res.ok) {
    if (res.rateLimited) {
      return { type: 'rateLimited', retryAfter: res.retryAfterSeconds ?? null };
    }
    return {
      type: 'error',
      message: res.message ?? 'Unable to resend invite.',
    };
  }

  return {
    type: 'success',
    candidate: normalized,
    rateLimited: Boolean(res.rateLimited),
    retryAfter: res.retryAfterSeconds ?? null,
    statusMessage: inviteStatusLabel(
      normalized?.inviteEmailStatus ?? res.inviteEmailStatus ?? 'sent',
    ),
  };
};
