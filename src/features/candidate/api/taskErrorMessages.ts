import { HttpError, extractBackendMessage } from '@/lib/api/errors/errors';

export const buildNetworkError = (message: string) => new HttpError(0, message);

export const deriveBackendMessage = (err: unknown) =>
  extractBackendMessage((err as { details?: unknown })?.details, false);

export const normalizeStatus = (err: unknown, fallback: number | null) => {
  const raw =
    err && typeof err === 'object'
      ? (err as { status?: unknown }).status
      : null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return fallback;
};

export const inviteLinkError = (status: number | null) =>
  status === 404 || status === 410;
