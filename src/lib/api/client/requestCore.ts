import { extractErrorMessage, parseResponseBody } from './response';
import { isSameOriginRequest } from './origin';
import type {
  ApiClientOptions,
  ApiErrorShape,
  InternalRequestOptions,
} from './shapes';

const DEFAULT_BASE_PATH =
  process.env.NEXT_PUBLIC_TENON_API_BASE_URL ?? '/api/backend';

export async function requestCore<TResponse = unknown>(
  path: string,
  options: InternalRequestOptions,
  clientOptions?: ApiClientOptions,
): Promise<{ data: TResponse; status: number; headers: Headers }> {
  const basePath = clientOptions?.basePath ?? DEFAULT_BASE_PATH;
  const targetUrl = path.startsWith('http')
    ? path
    : `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
  const sameOrigin = isSameOriginRequest(targetUrl);
  const fetchFn: typeof fetch = (
    globalThis as unknown as { fetch: typeof fetch }
  ).fetch;

  const credentials = options.credentials ?? (sameOrigin ? 'include' : 'omit');
  const cache = options.cache ?? (sameOrigin ? 'no-store' : undefined);

  let response: Response;
  try {
    response = (await fetchFn(targetUrl, {
      method: options.method,
      headers: options.headers,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      credentials,
      cache,
      signal: options.signal,
    })) as Response;
  } catch (err) {
    throw err;
  }

  const status = response.status;
  if (!response.ok) {
    const errorBody = await parseResponseBody(response);
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfterHeader
      ? Number(retryAfterHeader)
      : null;
    const details =
      retryAfterSeconds && !Number.isNaN(retryAfterSeconds)
        ? errorBody && typeof errorBody === 'object'
          ? { ...(errorBody as Record<string, unknown>), retryAfterSeconds }
          : { message: errorBody, retryAfterSeconds }
        : errorBody;
    const error: ApiErrorShape & { headers?: Headers } = {
      message: extractErrorMessage(errorBody, response.status),
      status: response.status,
      details,
      headers: response.headers,
    };
    throw error;
  }

  const parsed =
    response.status === 204
      ? (undefined as TResponse)
      : ((await parseResponseBody(response)) as TResponse);

  return { data: parsed, status, headers: response.headers };
}
