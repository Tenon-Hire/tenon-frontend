type MaybeErrorLike = { message?: unknown; detail?: unknown; status?: unknown };

export function errorDetailEnabled(): boolean {
  const flag = (process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS ?? '').toLowerCase();
  return flag === '1' || flag === 'true';
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

export type NormalizedApiError = {
  status: number | null;
  code?: string | null;
  message: string;
  action: 'retry' | 'refresh' | 'signin' | 'contact_support';
};

function extractErrorCode(err: unknown): string | null {
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

  return {
    status,
    code,
    message,
    action: 'retry',
  };
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
      allowDetail && typeof maybe.detail === 'string' ? maybe.detail : null;
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
