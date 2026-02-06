import { HttpError } from '@/lib/api/errors/errors';
import { toMappedHttpError } from '@/lib/api/errors/errorMapping';
import {
  buildNetworkError,
  deriveBackendMessage,
  normalizeStatus,
} from './taskErrorMessages';

const copyMapped = (
  mapped: HttpError,
  overrides?: { status?: number; message?: string },
): never => {
  const next = new HttpError(
    overrides?.status ?? mapped.status,
    overrides?.message ?? mapped.message,
    mapped.headers,
  );
  (next as { redirect?: (() => void) | undefined }).redirect = (
    mapped as { redirect?: (() => void) | undefined }
  ).redirect;
  (next as { raw?: unknown }).raw = (mapped as { raw?: unknown }).raw;
  (next as { meta?: unknown }).meta = (mapped as { meta?: unknown }).meta;
  throw next;
};

export const mapCurrentTaskError = (err: unknown): never => {
  if (err instanceof TypeError)
    throw buildNetworkError(
      'Network error. Please check your connection and try again.',
    );

  const backendMsg = deriveBackendMessage(err);
  const mapped = toMappedHttpError(
    err,
    'Something went wrong loading your current task.',
    'candidate',
  );
  const rawStatus =
    err && typeof err === 'object'
      ? (err as { status?: unknown }).status
      : null;
  const status = normalizeStatus(err, mapped.status);

  if (status === 404)
    return copyMapped(mapped, {
      status: 404,
      message:
        backendMsg ?? 'Session not found. Please reopen your invite link.',
    });
  if (status === 410)
    return copyMapped(mapped, {
      status: 410,
      message: backendMsg ?? 'That invite link has expired.',
    });
  if (typeof rawStatus !== 'number' || !Number.isFinite(status))
    return copyMapped(mapped, {
      status: 0,
      message:
        backendMsg ??
        'Network error. Please check your connection and try again.',
    });

  throw mapped;
};
