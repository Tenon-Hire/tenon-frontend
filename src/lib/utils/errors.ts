type MaybeErrorLike = { message?: unknown; detail?: unknown; status?: unknown };

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
  if (err instanceof Error && err.message.trim()) return err.message;

  if (err && typeof err === 'object') {
    const maybe = err as MaybeErrorLike;
    const detail =
      opts.includeDetail && typeof maybe.detail === 'string'
        ? maybe.detail
        : null;
    if (detail?.trim()) return detail.trim();

    const message =
      typeof maybe.message === 'string' ? maybe.message : undefined;
    if (message?.trim()) return message.trim();
  }

  return fallback;
}

export function isNotFound(err: unknown): boolean {
  return toStatus(err) === 404;
}

export function coerceError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  return new Error('Unknown error');
}
