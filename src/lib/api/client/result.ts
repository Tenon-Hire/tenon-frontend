import { mapApiError, type MappedError } from '../errors/errorMapping';
import { requestWithMeta } from './request';
import type { ApiClientOptions } from './shapes';

export type RequestResult<T> =
  | { ok: true; data: T; headers: Headers | null; requestId: string | null }
  | {
      ok: false;
      error: MappedError;
      headers: Headers | null;
      requestId: string | null;
    };

export async function httpResult<T>(
  path: string,
  options: Parameters<typeof requestWithMeta<T>>[1] = {},
  clientOptions?: ApiClientOptions,
  mode: 'recruiter' | 'candidate' = 'recruiter',
): Promise<RequestResult<T>> {
  try {
    const { data, headers } = await requestWithMeta<T>(
      path,
      options,
      clientOptions,
    );
    const requestId = headers?.get?.('x-tenon-request-id') ?? null;
    return { ok: true, data, headers: headers ?? null, requestId };
  } catch (error) {
    const headers = (error as { headers?: Headers }).headers ?? null;
    const requestId = headers?.get?.('x-tenon-request-id') ?? null;
    return {
      ok: false,
      error: mapApiError(error, 'Request failed', mode),
      headers,
      requestId,
    };
  }
}
