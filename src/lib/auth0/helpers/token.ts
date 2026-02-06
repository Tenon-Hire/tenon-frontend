import { Buffer } from 'buffer';

export const normalizeAccessToken = (raw: unknown): string | null => {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const token =
      (raw as { accessToken?: unknown }).accessToken ??
      (raw as { token?: unknown }).token;
    return typeof token === 'string' ? token : null;
  }
  return null;
};

export const decodeJwt = (
  token: string | null,
): Record<string, unknown> | null => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].padEnd(
      parts[1].length + ((4 - (parts[1].length % 4)) % 4),
      '=',
    );
    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
};
