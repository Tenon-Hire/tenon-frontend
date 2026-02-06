import { authRedirect } from './authRedirect';
import { toStatus, toUserMessage } from '@/lib/utils/errors';
import { HttpError } from './errors';

type RedirectFn = (() => void) | undefined;

export type MappedErrorMeta = {
  requestId?: string | null;
  upstreamStatus?: number | null;
};

export type MappedError = {
  message: string;
  status: number | null;
  redirect?: RedirectFn;
  raw?: unknown;
  meta?: MappedErrorMeta;
};

export function mapApiError(
  error: unknown,
  fallback: string,
  mode: 'recruiter' | 'candidate' = 'recruiter',
): MappedError {
  const status = toStatus(error);
  const message = toUserMessage(error, fallback, { includeDetail: true });
  const headers =
    error && typeof error === 'object'
      ? ((error as { headers?: Headers }).headers as Headers | undefined)
      : undefined;
  const requestId = headers?.get?.('x-tenon-request-id') ?? null;
  const upstream = headers?.get?.('x-tenon-upstream-status');
  const upstreamStatus = upstream ? Number(upstream) : null;
  return {
    message,
    status,
    redirect: authRedirect(status, mode),
    raw: error,
    meta: { requestId, upstreamStatus },
  };
}

export function toMappedHttpError(
  error: unknown,
  fallback: string,
  mode: 'recruiter' | 'candidate' = 'recruiter',
): HttpError {
  const mapped = mapApiError(error, fallback, mode);
  const err = new HttpError(
    mapped.status ?? 500,
    mapped.message,
    (error as { headers?: Headers }).headers,
  );
  (err as { redirect?: RedirectFn }).redirect = mapped.redirect;
  (err as { raw?: unknown }).raw = mapped.raw;
  (err as { meta?: MappedErrorMeta }).meta = mapped.meta;
  return err;
}

export function throwMappedApiError(
  error: unknown,
  fallback: string,
  mode: 'recruiter' | 'candidate' = 'recruiter',
): never {
  const mapped = toMappedHttpError(error, fallback, mode);
  const details =
    error && typeof error === 'object'
      ? (error as { details?: unknown }).details
      : undefined;
  if (details !== undefined) {
    (mapped as { details?: unknown }).details = details;
  }
  throw mapped;
}
