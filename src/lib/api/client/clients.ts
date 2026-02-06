import { authedRequest, splitArgs } from './authRequest';
import { requestWithMeta, __resetHttpClientCache } from './request';
import type { ApiClientOptions, HttpMethod, RequestOptions } from './shapes';
import { httpResult } from './result';

type InitOpts = RequestOptions & { method?: HttpMethod; body?: unknown };
const BFF_DEFAULTS: ApiClientOptions = { basePath: '/api', skipAuth: true };

export const httpRequest = async <T>(
  path: string,
  options: InitOpts = {},
  clientOptions?: ApiClientOptions,
): Promise<T> => {
  const method = (options.method ?? 'GET') as HttpMethod;
  return authedRequest<T>(path, { ...options, method }, clientOptions);
};

export const httpRequestWithMeta = async <T>(
  path: string,
  options: InitOpts = {},
  clientOptions?: ApiClientOptions,
) => {
  const method = (options.method ?? 'GET') as HttpMethod;
  const { data, headers } = await requestWithMeta<T>(
    path,
    { ...options, method },
    clientOptions,
  );
  return { data, headers };
};

const buildClient = (defaults?: ApiClientOptions) => {
  const call = <T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    opts?: RequestOptions | ApiClientOptions,
    clientOpts?: ApiClientOptions,
  ) => {
    const { requestOptions, clientOptions } = splitArgs(path, opts, clientOpts);
    return httpRequest<T>(
      path,
      { ...(requestOptions ?? {}), method, body },
      { ...(defaults ?? {}), ...(clientOptions ?? {}) },
    );
  };

  return {
    get: <T>(
      path: string,
      opts?: RequestOptions | ApiClientOptions,
      clientOpts?: ApiClientOptions,
    ) => call<T>('GET', path, undefined, opts, clientOpts),
    delete: <T>(
      path: string,
      opts?: RequestOptions | ApiClientOptions,
      clientOpts?: ApiClientOptions,
    ) => call<T>('DELETE', path, undefined, opts, clientOpts),
    post: <T>(
      path: string,
      body?: unknown,
      opts?: RequestOptions | ApiClientOptions,
      clientOpts?: ApiClientOptions,
    ) => call<T>('POST', path, body, opts, clientOpts),
    put: <T>(
      path: string,
      body?: unknown,
      opts?: RequestOptions | ApiClientOptions,
      clientOpts?: ApiClientOptions,
    ) => call<T>('PUT', path, body, opts, clientOpts),
    patch: <T>(
      path: string,
      body?: unknown,
      opts?: RequestOptions | ApiClientOptions,
      clientOpts?: ApiClientOptions,
    ) => call<T>('PATCH', path, body, opts, clientOpts),
  };
};

export const apiClient = buildClient();
export const recruiterBffClient = buildClient(BFF_DEFAULTS);

export const bffClient = {
  get: <T>(
    path: string,
    opts?: RequestOptions | ApiClientOptions,
    clientOpts?: ApiClientOptions,
  ) =>
    httpResult<T>(path, opts as RequestOptions, {
      ...BFF_DEFAULTS,
      ...(clientOpts ?? {}),
    }),
};

export const login = (payload: { email: string; password: string }) =>
  authedRequest('/auth/login', { method: 'POST', body: payload });

export { httpResult, __resetHttpClientCache };
