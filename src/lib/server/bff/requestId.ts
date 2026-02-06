import { randomUUID } from 'crypto';
import { REQUEST_ID_HEADER } from './constants';

export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    const maybe = (crypto as { randomUUID?: () => string }).randomUUID;
    if (typeof maybe === 'function') return maybe();
  }
  try {
    return randomUUID();
  } catch {
    return `req-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
  }
}

export function readRequestId(
  headers?: Headers | { get?: (key: string) => string | null },
): string | null {
  if (!headers || typeof headers.get !== 'function') return null;
  const existing = headers.get(REQUEST_ID_HEADER);
  return existing && typeof existing === 'string' ? existing : null;
}

export function resolveRequestId(
  headers?: Headers | { get?: (key: string) => string | null },
  fallback?: string,
): string {
  return readRequestId(headers) ?? fallback ?? generateRequestId();
}
