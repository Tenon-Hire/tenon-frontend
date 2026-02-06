import { HttpError } from '@/lib/api/errors/errors';

type ResponseWithData = {
  data?: unknown;
  requestId?: unknown;
  headers?: Headers;
};

type ResponseWithError = {
  ok?: unknown;
  message?: unknown;
  status?: unknown;
  details?: unknown;
  error?: unknown;
};

const readRequestId = (res: ResponseWithData | null) =>
  (res?.requestId as string | null) ??
  res?.headers?.get?.('x-tenon-request-id') ??
  null;

export function parseRecruiterResponse<T>(res: unknown): {
  data: T;
  requestId: string | null;
} {
  if (res === null || res === undefined) {
    throw new HttpError(500, 'Request failed');
  }

  if (
    res &&
    typeof res === 'object' &&
    (res as ResponseWithError).ok === false
  ) {
    const message = (res as ResponseWithError).message ?? 'Request failed';
    const errorStatus = (res as { error?: { status?: unknown } }).error?.status;
    const status = (res as ResponseWithError).status ?? errorStatus ?? 500;
    const err = new HttpError(
      typeof status === 'number' ? status : 500,
      typeof message === 'string' ? message : 'Request failed',
    );
    (err as { details?: unknown }).details =
      (res as ResponseWithError).details ??
      (res as ResponseWithError).error ??
      null;
    throw err;
  }

  if (res && typeof res === 'object' && 'data' in (res as ResponseWithData)) {
    const data = (res as ResponseWithData).data as T;
    return { data, requestId: readRequestId(res as ResponseWithData) };
  }

  return { data: res as T, requestId: readRequestId(res as ResponseWithData) };
}
