import type { InviteCandidateResponse } from './types';

export const normalizeInviteResponse = (
  raw: unknown,
  buildInviteUrl: (token: string) => string,
): InviteCandidateResponse => {
  if (!raw || typeof raw !== 'object') {
    return {
      candidateSessionId: '',
      token: '',
      inviteUrl: '',
      outcome: 'created',
    };
  }
  const rec = raw as Record<string, unknown>;
  const token =
    typeof rec.token === 'string'
      ? rec.token
      : typeof rec.inviteToken === 'string'
        ? rec.inviteToken
        : typeof rec.invite_token === 'string'
          ? rec.invite_token
          : '';
  const providedUrl =
    typeof rec.inviteUrl === 'string'
      ? rec.inviteUrl
      : typeof rec.invite_url === 'string'
        ? rec.invite_url
        : '';
  const inviteUrl = providedUrl?.trim() || (token ? buildInviteUrl(token) : '');

  return {
    candidateSessionId: String(
      rec.candidateSessionId ?? rec.candidate_session_id ?? rec.id ?? '',
    ),
    token,
    inviteUrl,
    outcome: 'created',
  };
};
