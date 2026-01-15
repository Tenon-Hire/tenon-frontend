type MaybeErrorLike = { message?: unknown; detail?: unknown; status?: unknown };

export function errorDetailEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS === '1' ||
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS === 'true'
  );
}

function redactTokens(value: string): string {
  let next = value;
  next = next.replace(
    /\beyJ[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+\b/g,
    '[redacted]',
  );
  next = next.replace(
    /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi,
    'Bearer [redacted]',
  );
  next = next.replace(
    /([?&](?:access_token|id_token|refresh_token|token|auth_token)=)[^&\s]+/gi,
    '$1[redacted]',
  );
  return next;
}

function sanitizeMessage(value: string): string {
  return redactTokens(value).trim();
}

export function toStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const maybe = err as MaybeErrorLike;
  return typeof maybe.status === 'number' ? maybe.status : null;
}

export function toUserMessage(
  err: unknown,
  fallback: string,
  opts: { includeDetail?: boolean } = {},
): string {
  const allowDetail = Boolean(opts.includeDetail && errorDetailEnabled());

  if (err instanceof Error && err.message.trim()) {
    return sanitizeMessage(err.message);
  }

  if (err && typeof err === 'object') {
    const maybe = err as MaybeErrorLike;
    const detail =
      allowDetail && typeof maybe.detail === 'string'
        ? maybe.detail
        : null;
    if (detail?.trim()) return sanitizeMessage(detail);

    const message =
      typeof maybe.message === 'string' ? maybe.message : undefined;
    if (message?.trim()) return sanitizeMessage(message);
  }

  return sanitizeMessage(fallback);
}

export function isNotFound(err: unknown): boolean {
  return toStatus(err) === 404;
}

export function coerceError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  return new Error('Unknown error');
}
