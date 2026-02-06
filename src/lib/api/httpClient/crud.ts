import { authedRequest, splitArgs } from './authRequest';
import type { ApiClientOptions, RequestOptions } from './shapes';

export type CrudClient = {
  get: <T = unknown>(
    path: string,
    opts?: RequestOptions | ApiClientOptions,
    clientOptions?: ApiClientOptions,
  ) => Promise<T>;
  delete: <T = unknown>(
    path: string,
    opts?: RequestOptions | ApiClientOptions,
    clientOptions?: ApiClientOptions,
  ) => Promise<T>;
  post: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: RequestOptions | ApiClientOptions,
    clientOptions?: ApiClientOptions,
  ) => Promise<T>;
  put: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: RequestOptions | ApiClientOptions,
    clientOptions?: ApiClientOptions,
  ) => Promise<T>;
  patch: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: RequestOptions | ApiClientOptions,
    clientOptions?: ApiClientOptions,
  ) => Promise<T>;
};

const call = <T>(
  method: 'GET' | 'DELETE' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  requestOptions: RequestOptions | undefined,
  clientOptions: ApiClientOptions | undefined,
  body?: unknown,
) =>
  authedRequest<T>(
    path,
    { ...(requestOptions ?? {}), method, body },
    clientOptions,
  );

export const buildScopedClient = (defaults: ApiClientOptions): CrudClient => ({
  get: (path, opts, clientOpts) => {
    const { requestOptions, clientOptions } = splitArgs(path, opts, clientOpts);
    return call('GET', path, requestOptions, clientOptions ?? defaults);
  },
  delete: (path, opts, clientOpts) => {
    const { requestOptions, clientOptions } = splitArgs(path, opts, clientOpts);
    return call('DELETE', path, requestOptions, clientOptions ?? defaults);
  },
  post: (path, body, opts, clientOpts) => {
    const { requestOptions, clientOptions } = splitArgs(path, opts, clientOpts);
    return call('POST', path, requestOptions, clientOptions ?? defaults, body);
  },
  put: (path, body, opts, clientOpts) => {
    const { requestOptions, clientOptions } = splitArgs(path, opts, clientOpts);
    return call('PUT', path, requestOptions, clientOptions ?? defaults, body);
  },
  patch: (path, body, opts, clientOpts) => {
    const { requestOptions, clientOptions } = splitArgs(path, opts, clientOpts);
    return call('PATCH', path, requestOptions, clientOptions ?? defaults, body);
  },
});

export const buildApiMethod =
  (method: 'GET' | 'DELETE') =>
  <T>(
    path: string,
    arg2?: ApiClientOptions | RequestOptions,
    arg3?: ApiClientOptions,
  ) => {
    const { requestOptions, clientOptions } = splitArgs(path, arg2, arg3);
    return call<T>(method, path, requestOptions, clientOptions);
  };

export const buildApiMethodWithBody =
  (method: 'POST' | 'PUT' | 'PATCH') =>
  <T>(
    path: string,
    body?: unknown,
    arg3?: ApiClientOptions | RequestOptions,
    arg4?: ApiClientOptions,
  ) => {
    const { requestOptions, clientOptions } = splitArgs(path, arg3, arg4);
    return call<T>(method, path, requestOptions, clientOptions, body);
  };
