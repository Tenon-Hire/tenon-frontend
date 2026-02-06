import { HttpError } from '@/lib/api/errors/errors';
import { toMappedHttpError } from '@/lib/api/errors/errorMapping';
import { deriveBackendMessage, normalizeStatus } from './taskErrorMessages';

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

export const mapSubmitTaskError = (err: unknown): never => {
  if (err instanceof TypeError)
    throw new HttpError(
      0,
      'Network error. Please check your connection and try again.',
      (err as { headers?: Headers }).headers,
    );

  const backendMsg = deriveBackendMessage(err);
  const mapped = toMappedHttpError(
    err,
    'Something went wrong submitting your task.',
    'candidate',
  );
  const status = normalizeStatus(err, mapped.status);

  if (status === 400)
    return copyMapped(mapped, {
      status: 400,
      message: backendMsg ?? 'Task out of order.',
    });
  if (status === 404)
    return copyMapped(mapped, {
      status: 404,
      message:
        backendMsg ?? 'Session mismatch. Please reopen your invite link.',
    });
  if (status === 409)
    return copyMapped(mapped, {
      status: 409,
      message: backendMsg ?? 'Task already submitted.',
    });
  if (status === 410)
    return copyMapped(mapped, {
      status: 410,
      message: backendMsg ?? 'That invite link has expired.',
    });
  if (!Number.isFinite(status))
    return copyMapped(mapped, {
      status: 0,
      message:
        backendMsg ??
        'Network error. Please check your connection and try again.',
    });

  const fallbackMessage =
    backendMsg ?? 'Something went wrong submitting your task.';
  throw copyMapped(mapped, { message: fallbackMessage });
};
