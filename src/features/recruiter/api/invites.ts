import { normalizeInviteResponse } from './inviteNormalizeResponse';
import { requestRecruiterBff } from './requestRecruiterBff';
import { safeId } from './simUtils';
import { throwMappedApiError } from '@/lib/api/errors/errorMapping';
import type { InviteCandidateResponse } from './types';

export async function inviteCandidate(
  simulationId: string,
  candidateName: string,
  inviteEmail: string,
): Promise<InviteCandidateResponse> {
  const trim = (value: unknown) =>
    typeof value === 'string' || typeof value === 'number'
      ? String(value).trim()
      : '';
  const id = trim(simulationId);
  const name = trim(candidateName);
  const email = trim(inviteEmail).toLowerCase();

  if (!id || !name || !email) {
    return {
      candidateSessionId: '',
      token: '',
      inviteUrl: '',
      outcome: 'created',
    };
  }

  try {
    const { data } = await requestRecruiterBff<unknown>(
      `/simulations/${id}/invite`,
      {
        method: 'POST',
        body: { candidateName: name, inviteEmail: email },
      },
    );
    return normalizeInviteResponse(data, buildInviteUrl);
  } catch (error) {
    throwMappedApiError(error, 'Unable to send invite.', 'recruiter');
  }
}

export async function resendInvite(
  simulationId: string | number,
  candidateSessionId: number,
): Promise<unknown> {
  const id = safeId(simulationId);
  const candidateId = Number.isFinite(candidateSessionId)
    ? String(candidateSessionId)
    : '';
  if (!id || !candidateId) return null;

  const { data } = await requestRecruiterBff(
    `/simulations/${encodeURIComponent(id)}/candidates/${encodeURIComponent(candidateId)}/invite/resend`,
    { method: 'POST' },
  );
  return data;
}

function buildInviteUrl(token: string) {
  const path = `/candidate/session/${token}`;
  if (typeof window === 'undefined' || !window.location?.origin) return path;
  return `${window.location.origin}${path}`;
}
