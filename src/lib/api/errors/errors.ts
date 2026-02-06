import {
  errorDetailEnabled,
  isNotFound,
  normalizeApiError,
  toStatus,
  toUserMessage,
  type NormalizedApiError,
} from '@/lib/errors/errors';

type BackendLike = { message?: unknown; detail?: unknown; status?: unknown };

export class HttpError extends Error {
  status: number;
  headers?: Headers;
  constructor(status: number, message: string, headers?: Headers) {
    super(message);
    this.status = status;
    this.headers = headers;
    this.name = 'HttpError';
    Object.defineProperty(this, 'message', {
      value: message,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
}

export function extractBackendMessage(
  value: unknown,
  allowPlainString = true,
): string | null {
  if (allowPlainString && typeof value === 'string' && value.trim())
    return value.trim();
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const detail = record['detail'];
    const message = record['message'];

    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return null;
}

export function fallbackStatus(err: unknown, defaultStatus: number) {
  const maybeStatus =
    err && typeof err === 'object'
      ? (err as { status?: unknown }).status
      : null;
  return typeof maybeStatus === 'number' ? maybeStatus : defaultStatus;
}

export function toHttpError(
  err: unknown,
  fallback: { status: number; message: string },
) {
  if (err instanceof HttpError) return err;
  if (err instanceof TypeError) {
    return new HttpError(
      0,
      'Network error. Please check your connection and try again.',
    );
  }

  if (err && typeof err === 'object') {
    const maybeStatus = (err as BackendLike).status;
    const maybeMsg = (err as BackendLike).message;
    const headers = (err as { headers?: Headers }).headers;
    const status =
      typeof maybeStatus === 'number' ? maybeStatus : fallback.status;
    const message =
      typeof maybeMsg === 'string' && maybeMsg.trim()
        ? maybeMsg
        : fallback.message;
    return new HttpError(status, message, headers);
  }

  return new HttpError(fallback.status, fallback.message);
}

export {
  errorDetailEnabled,
  isNotFound,
  normalizeApiError,
  toStatus,
  toUserMessage,
  type NormalizedApiError,
};
