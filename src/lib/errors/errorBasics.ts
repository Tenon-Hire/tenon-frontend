type MaybeErrorLike = { message?: unknown; detail?: unknown; status?: unknown };

export function errorDetailEnabled(): boolean {
  const flag = (process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS ?? '').toLowerCase();
  return flag === '1' || flag === 'true';
}

const redactTokens = (value: string) =>
  value
    .replace(
      /\beyJ[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+\b/g,
      '[redacted]',
    )
    .replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi, 'Bearer [redacted]')
    .replace(
      /([?&](?:access_token|id_token|refresh_token|token|auth_token)=)[^&\s]+/gi,
      '$1[redacted]',
    );

export const sanitizeMessage = (value: string) => redactTokens(value).trim();

export function toStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const maybe = err as MaybeErrorLike;
  return typeof maybe.status === 'number' ? maybe.status : null;
}

export function extractErrorCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const record = err as Record<string, unknown>;
  if (typeof record.code === 'string' && record.code.trim()) return record.code;
  const nestedError = record.error;
  if (nestedError && typeof nestedError === 'object') {
    const code = (nestedError as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim()) return code;
  }
  if (typeof record.detail === 'object' && record.detail !== null) {
    const detail = record.detail as { code?: unknown };
    if (typeof detail.code === 'string' && detail.code.trim())
      return detail.code;
  }
  return null;
}

export function toUserMessage(
  err: unknown,
  fallback: string,
  opts: { includeDetail?: boolean } = {},
): string {
  const allowDetail = Boolean(opts.includeDetail && errorDetailEnabled());

  if (err instanceof Error && err.message.trim())
    return sanitizeMessage(err.message);

  if (err && typeof err === 'object') {
    const maybe = err as MaybeErrorLike;
    const detail =
      allowDetail && typeof maybe.detail === 'string' ? maybe.detail : null;
    if (detail?.trim()) return sanitizeMessage(detail);

    const message =
      typeof maybe.message === 'string' ? maybe.message : undefined;
    if (message?.trim()) return sanitizeMessage(message);
  }

  return sanitizeMessage(fallback);
}

export const isNotFound = (err: unknown) => toStatus(err) === 404;

export function coerceError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  return new Error('Unknown error');
}
