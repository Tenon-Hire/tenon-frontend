import { requestRecruiterBff } from './requestRecruiterBff';
import { safeId } from './simUtils';
import { toStatus, toUserMessage } from '@/lib/errors/errors';
import type { ResendInviteResult } from './types';

const parseRetryAfterSeconds = (details: unknown): number | null => {
  if (!details || typeof details !== 'object') return null;
  const record = details as Record<string, unknown>;
  const keys = [
    'retryAfterSeconds',
    'retry_after_seconds',
    'cooldownSeconds',
    'cooldown_seconds',
  ];
  for (const key of keys) {
    const value = record[key];
    const num =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : null;
    if (Number.isFinite(num)) return num as number;
  }
  return null;
};

const parseInviteStatus = (details: unknown): string | null => {
  if (details && typeof details === 'object') {
    const value = (details as { inviteEmailStatus?: unknown })
      .inviteEmailStatus;
    if (typeof value === 'string') return value;
  }
  return null;
};

export async function resendCandidateInvite(
  simulationId: string | number,
  candidateSessionId: string | number,
): Promise<ResendInviteResult> {
  const simId = safeId(simulationId);
  const candidateId = safeId(candidateSessionId);
  if (!simId || !candidateId) {
    return {
      ok: false,
      status: 400,
      message: 'Missing simulation or candidate id.',
      retryAfterSeconds: null,
      inviteEmailStatus: null,
      rateLimited: false,
      notFound: false,
      body: null,
    };
  }

  try {
    const { data: body } = await requestRecruiterBff<unknown>(
      `/simulations/${encodeURIComponent(simId)}/candidates/${encodeURIComponent(candidateId)}/invite/resend`,
      { method: 'POST', cache: 'no-store' },
    );

    return {
      ok: true,
      status: 200,
      message: null,
      retryAfterSeconds: parseRetryAfterSeconds(body),
      inviteEmailStatus: parseInviteStatus(body),
      rateLimited: false,
      notFound: false,
      body,
    };
  } catch (err) {
    const status = toStatus(err) ?? 0;
    const details =
      err && typeof err === 'object'
        ? ((err as { details?: unknown }).details ?? null)
        : null;
    const retryAfterHeader =
      err &&
      typeof err === 'object' &&
      (err as { headers?: Headers }).headers?.get?.('retry-after');
    const headerSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;
    const inviteEmailStatus = parseInviteStatus(details);
    const rateLimited = status === 429 || inviteEmailStatus === 'rate_limited';
    return {
      ok: false,
      status,
      message: toUserMessage(err, 'Unable to resend invite.', {
        includeDetail: true,
      }),
      retryAfterSeconds:
        parseRetryAfterSeconds(details) ||
        (Number.isFinite(headerSeconds) ? (headerSeconds as number) : null),
      inviteEmailStatus,
      rateLimited,
      notFound: status === 404,
      body: details,
    };
  }
}
