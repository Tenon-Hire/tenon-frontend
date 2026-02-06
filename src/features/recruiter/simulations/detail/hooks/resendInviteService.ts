import { resendCandidateInvite } from '@/features/recruiter/api/resendCandidateInvite';
import type { CandidateSession } from '@/features/recruiter/types';
import { toResendOutcome } from './resendInviteOutcome';
import type { ResendOutcome } from './resendInviteOutcome';

export async function fetchResendOutcome(
  simulationId: string,
  candidate: CandidateSession,
): Promise<ResendOutcome> {
  const res = await resendCandidateInvite(
    simulationId,
    candidate.candidateSessionId,
  );
  const normalized = res.body as CandidateSession | null;
  return toResendOutcome(res, normalized);
}
