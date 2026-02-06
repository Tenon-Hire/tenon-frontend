import { extractErrorCode, toStatus, toUserMessage } from './errorBasics';
import type { NormalizedApiError } from './errorTypes';

export function normalizeApiError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): NormalizedApiError {
  const status = toStatus(err);
  const message = toUserMessage(err, fallback);
  const code =
    extractErrorCode(
      err && typeof err === 'object'
        ? (err as { details?: unknown }).details
        : null,
    ) ?? extractErrorCode(err);

  if (status === 401 || status === 403) {
    return {
      status,
      code,
      message: 'Session expired. Please sign in again.',
      action: 'signin',
    };
  }
  if (status === 404) {
    return {
      status,
      code,
      message: 'Not found. Refresh or reopen the link.',
      action: 'refresh',
    };
  }
  if (status === 429) {
    return {
      status,
      code,
      message: 'Too many attempts. Please wait and retry.',
      action: 'retry',
    };
  }
  if (status === 408 || status === 504 || status === 0) {
    return {
      status,
      code,
      message: 'Request timed out. Check your connection and retry.',
      action: 'retry',
    };
  }
  if (status && status >= 500) {
    return {
      status,
      code,
      message: 'Server issue. Please retry or contact support.',
      action: 'contact_support',
    };
  }
  return { status, code, message, action: 'retry' };
}
