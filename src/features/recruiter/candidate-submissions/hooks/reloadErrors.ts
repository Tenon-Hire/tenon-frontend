import { toUserMessage, errorDetailEnabled } from '@/lib/utils/errors';

export function formatReloadError(err: unknown, fallback: string): string {
  const includeDetail = errorDetailEnabled();
  if (typeof err === 'string') {
    const message = err.trim();
    if (includeDetail && message) return message;
    return 'Request failed';
  }

  const raw = toUserMessage(err, fallback, { includeDetail });
  if (/request failed with status/i.test(raw)) return fallback;
  return raw?.trim() ? raw : fallback;
}
