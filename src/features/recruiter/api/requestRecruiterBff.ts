import { recruiterBffClient } from '@/lib/api/client';
import type { HttpMethod, RequestOptions } from '@/lib/api/client/shapes';
import { HttpError } from '@/lib/api/errors/errors';
import { runRecruiterFallback } from './recruiterRequestFallback';
import { parseRecruiterResponse } from './recruiterResponse';

type RecruiterRequestOptions = RequestOptions & {
  method?: HttpMethod;
  body?: unknown;
};

export async function requestRecruiterBff<T>(
  path: string,
  options: RecruiterRequestOptions = {},
) {
  const methodUpper = (options.method ?? 'GET') as HttpMethod;
  const method = methodUpper.toLowerCase() as Lowercase<HttpMethod>;
  const client = recruiterBffClient as unknown as Record<string, unknown>;
  const exec = async (target: string, opts: RecruiterRequestOptions) => {
    if (typeof client[method] === 'function') {
      const { body, method: _ignored, ...rest } = opts ?? {};
      const call = client[method] as (...args: unknown[]) => Promise<unknown>;
      if (methodUpper === 'GET' || methodUpper === 'DELETE') {
        return call(target, rest);
      }
      return call(target, body, rest);
    }
    return runRecruiterFallback(target, opts, methodUpper);
  };

  try {
    const res = await exec(path, options);
    return parseRecruiterResponse<T>(res);
  } catch (err) {
    throw toRecruiterHttpError(err);
  }
}

export { recruiterBffClient };

function toRecruiterHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  const message =
    err instanceof Error && err.message ? err.message : 'Request failed';
  const httpErr = new HttpError(
    (err as { status?: number })?.status ?? 500,
    message,
    (err as { headers?: Headers }).headers,
  );
  if (err && typeof err === 'object') {
    (httpErr as { details?: unknown }).details = (
      err as { details?: unknown }
    ).details;
  }
  return httpErr;
}
