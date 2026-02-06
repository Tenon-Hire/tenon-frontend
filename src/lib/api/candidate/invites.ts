import {
  INVITE_EXPIRED_MESSAGE,
  INVITE_UNAVAILABLE_MESSAGE,
} from '@/lib/copy/invite';
import { apiClient } from '../httpClient';
import { HttpError, extractBackendMessage, fallbackStatus } from '../errors';
import { ensureAuthToken, mapCandidateApiError, toClientOptions } from './base';
import { normalizeCandidateInvite } from './inviteNormalize';
import type {
  CandidateInvite,
  CandidateSessionBootstrapResponse,
} from './types';

export async function listCandidateInvites(
  authToken: string,
): Promise<CandidateInvite[]> {
  ensureAuthToken(authToken);
  try {
    const data = await apiClient.get<unknown[]>(
      '/candidate/invites',
      { cache: 'no-store' },
      toClientOptions(authToken),
    );
    return Array.isArray(data) ? data.map(normalizeCandidateInvite) : [];
  } catch (err) {
    mapCandidateApiError(err, 'Unable to load your invites right now.');
  }
}

export async function resolveCandidateInviteToken(
  token: string,
  authToken: string,
  options?: { skipCache?: boolean },
) {
  ensureAuthToken(authToken);
  const path = `/candidate/session/${encodeURIComponent(token)}`;
  try {
    return await apiClient.get<CandidateSessionBootstrapResponse>(
      path,
      { cache: 'no-store', skipCache: options?.skipCache },
      toClientOptions(authToken),
    );
  } catch (err) {
    if (err && typeof err === 'object') {
      const status = (err as { status?: unknown }).status;
      const details = (err as { details?: unknown }).details;
      const backendMsg = extractBackendMessage(details, true) ?? '';
      const lowerMsg = backendMsg.toLowerCase();

      if (status === 400 || status === 404 || status === 409)
        throw new HttpError(status, INVITE_UNAVAILABLE_MESSAGE);
      if (status === 401) throw new HttpError(401, 'Please sign in again.');
      if (status === 403) {
        if (
          lowerMsg.includes('verify') ||
          lowerMsg.includes('email verification') ||
          lowerMsg.includes('email_verified')
        ) {
          throw new HttpError(403, 'Please verify your email, then try again.');
        }
        if (lowerMsg.includes('email claim') || lowerMsg.includes('email')) {
          throw new HttpError(
            403,
            'We could not confirm your email. Please sign in again.',
          );
        }
        throw new HttpError(403, 'You do not have access to this invite.');
      }
      if (status === 410) throw new HttpError(410, INVITE_EXPIRED_MESSAGE);

      const fallbackMsg =
        extractBackendMessage(details, false) ?? backendMsg ?? '';
      const safeStatus =
        typeof status === 'number' ? status : fallbackStatus(err, 500);
      throw new HttpError(
        safeStatus,
        fallbackMsg.trim() || 'Something went wrong loading your simulation.',
      );
    }
    mapCandidateApiError(err, 'Something went wrong loading your simulation.');
  }
}
