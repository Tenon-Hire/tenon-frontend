import { TextDecoder, TextEncoder } from 'util';
import { ReadableStream, WritableStream } from 'stream/web';
import { MessageChannel, MessagePort } from 'worker_threads';

// Polyfill for undici expectations in test environment.
global.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
global.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
global.ReadableStream =
  ReadableStream as unknown as typeof globalThis.ReadableStream;
global.WritableStream =
  WritableStream as unknown as typeof globalThis.WritableStream;
global.MessageChannel =
  MessageChannel as unknown as typeof globalThis.MessageChannel;
global.MessagePort = MessagePort as unknown as typeof globalThis.MessagePort;

jest.mock('next/server', () => {
  const buildHeaders = (init?: Record<string, string>) => {
    const store = new Map<string, string>();
    Object.entries(init ?? {}).forEach(([k, v]) =>
      store.set(k.toLowerCase(), v),
    );
    return {
      get: (key: string) => store.get(key.toLowerCase()) ?? null,
      set: (key: string, value: string) => store.set(key.toLowerCase(), value),
      delete: (key: string) => store.delete(key.toLowerCase()),
    };
  };

  return {
    NextResponse: {
      json: (
        body: unknown,
        init?: { status?: number; headers?: Record<string, string> },
      ) => ({
        status: init?.status ?? 200,
        headers: buildHeaders(init?.headers),
        body,
      }),
      redirect: (url: URL | string) => ({
        status: 307,
        headers: buildHeaders({ location: url.toString() }),
      }),
    },
  };
});

jest.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: jest.fn(),
    getAccessToken: jest.fn(),
    middleware: jest.fn(),
  },
  getAccessToken: jest.fn(),
  getSessionNormalized: jest.fn(),
}));

const realFetch = global.fetch;
const originalBackendBase = process.env.TENON_BACKEND_BASE_URL;
const originalDispatcherEnv = process.env.TENON_USE_FETCH_DISPATCHER;

function mockJsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  const headerMap = new Map<string, string>();
  Object.entries(headers ?? { 'content-type': 'application/json' }).forEach(
    ([k, v]) => headerMap.set(k.toLowerCase(), v),
  );
  return {
    status,
    headers: {
      get: (key: string) => headerMap.get(key.toLowerCase()) ?? null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('forwardJson', () => {
  const fetchMock = jest.fn();
  let forwardJson: (typeof import('@/lib/server/bff'))['forwardJson'];
  let upstreamHeader: (typeof import('@/lib/server/bff'))['UPSTREAM_HEADER'];
  let requestIdHeader: (typeof import('@/lib/server/bff'))['REQUEST_ID_HEADER'];

  beforeEach(async () => {
    jest.resetModules();
    process.env.TENON_USE_FETCH_DISPATCHER = originalDispatcherEnv;
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    const mod = await import('@/lib/server/bff');
    forwardJson = mod.forwardJson;
    upstreamHeader = mod.UPSTREAM_HEADER;
    requestIdHeader = mod.REQUEST_ID_HEADER;
  });

  afterEach(() => {
    process.env.TENON_BACKEND_BASE_URL = originalBackendBase;
    process.env.TENON_USE_FETCH_DISPATCHER = originalDispatcherEnv;
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('forwards authorization header and propagates request id', async () => {
    fetchMock.mockResolvedValue(
      mockJsonResponse({ ok: true }, 200, {
        'content-type': 'application/json',
      }),
    );

    const res = await forwardJson({
      path: '/api/test',
      accessToken: 'token-123',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('authorization')).toBe(
      'Bearer token-123',
    );
    expect((init.headers as Headers).get(requestIdHeader)).toBeTruthy();
    expect(init.redirect).toBe('manual');
    expect(res.headers.get(upstreamHeader)).toBe('200');
    expect(res.headers.get(requestIdHeader)).toBeTruthy();
  });

  it('uses BACKEND_BASE_URL when provided', async () => {
    process.env.TENON_BACKEND_BASE_URL = 'https://api.example.com';
    fetchMock.mockResolvedValue(mockJsonResponse({ ok: true }));

    await forwardJson({
      path: '/api/test',
      accessToken: 'token-123',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/test');
    expect((init.headers as Headers).get('authorization')).toBe(
      'Bearer token-123',
    );
    expect(init.redirect).toBe('manual');
  });

  it('defaults content-type for JSON bodies when missing', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ ok: true }, 200));

    await forwardJson({
      path: '/api/test',
      method: 'POST',
      body: { foo: 'bar' },
      accessToken: 'tok',
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get('content-type')).toBe(
      'application/json',
    );
    expect(init.body).toBe(JSON.stringify({ foo: 'bar' }));
  });

  it('preserves caller content-type and raw string bodies', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ ok: true }, 200));

    await forwardJson({
      path: '/api/test',
      method: 'POST',
      body: 'raw-body',
      headers: { 'Content-Type': 'text/plain' },
      accessToken: 'tok',
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get('content-type')).toBe('text/plain');
    expect(init.body).toBe('raw-body');
  });

  it('retries GET on 503 then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ ok: false }, 503))
      .mockResolvedValueOnce(mockJsonResponse({ ok: true }, 200));

    const res = await forwardJson({
      path: '/api/test',
      accessToken: 'token-123',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
    expect(res.headers.get(upstreamHeader)).toBe('200');
  });

  it('does not retry non-idempotent methods', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ ok: false }, 503));

    const res = await forwardJson({
      path: '/api/test',
      accessToken: 'token-123',
      method: 'POST',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(503);
  });

  it('aborts on timeout and surfaces error', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const promise = forwardJson({
      path: '/api/test',
      accessToken: 'token-123',
      timeoutMs: 10,
    });

    jest.advanceTimersByTime(20);

    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('Request timed out');

    const { errorResponse } = await import('@/app/api/utils');
    const resp = errorResponse(error);
    expect(resp.status).toBe(500);
    const respBody = resp.body as unknown as { message: string };
    expect(respBody.message).toContain('Request timed out');
  });
});

describe('upstreamRequest robustness', () => {
  const fetchMock = jest.fn();
  let upstreamRequest: (typeof import('@/lib/server/bff'))['upstreamRequest'];

  beforeEach(async () => {
    jest.resetModules();
    process.env.TENON_USE_FETCH_DISPATCHER = originalDispatcherEnv;
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    upstreamRequest = (await import('@/lib/server/bff')).upstreamRequest;
  });

  afterEach(() => {
    process.env.TENON_USE_FETCH_DISPATCHER = originalDispatcherEnv;
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('cancels previous body on retry', async () => {
    const cancel = jest.fn();
    fetchMock
      .mockResolvedValueOnce({
        status: 503,
        headers: { get: () => 'application/json' },
        json: async () => ({ ok: false }),
        text: async () => JSON.stringify({ ok: false }),
        body: { cancel },
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Response)
      .mockResolvedValueOnce(
        mockJsonResponse({ ok: true }, 200, {
          'content-type': 'application/json',
        }),
      );

    await upstreamRequest({
      url: 'http://api.test/api/foo',
      requestId: 'req-1',
    });
    expect(cancel).toHaveBeenCalled();
  });

  it('continues retrying when cancel rejects', async () => {
    const cancel = jest.fn().mockRejectedValue(new Error('cancel fail'));
    fetchMock
      .mockResolvedValueOnce({
        status: 503,
        headers: { get: () => 'application/json' },
        json: async () => ({ ok: false }),
        text: async () => JSON.stringify({ ok: false }),
        body: { cancel },
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Response)
      .mockResolvedValueOnce(
        mockJsonResponse({ ok: true }, 200, {
          'content-type': 'application/json',
        }),
      );

    const res = await upstreamRequest({
      url: 'http://api.test/api/cancel-retry',
      requestId: 'req-1b',
    });
    expect(cancel).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('aborts quickly when signal is aborted during backoff', async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ ok: false }, 503));

    const promise = upstreamRequest({
      url: 'http://api.test/api/foo',
      requestId: 'req-2',
      signal: controller.signal,
    });

    controller.abort(new DOMException('Aborted', 'AbortError'));
    await expect(promise).rejects.toBeInstanceOf(DOMException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries 429 respecting retry-after', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({ ok: false }, 429, { 'retry-after': '0' }),
      )
      .mockResolvedValueOnce(mockJsonResponse({ ok: true }, 200));

    const promise = upstreamRequest({
      url: 'http://api.test/api/foo',
      requestId: 'req-3',
    });

    const res = await promise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it('retries 429 with http-date retry-after', async () => {
    const future = new Date(Date.now() + 1500).toUTCString();
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({ ok: false }, 429, { 'retry-after': future }),
      )
      .mockResolvedValueOnce(mockJsonResponse({ ok: true }, 200));

    const res = await upstreamRequest({
      url: 'http://api.test/api/foo',
      requestId: 'req-3b',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it('respects maxTotalTimeMs budget across retries', async () => {
    jest.useFakeTimers();
    fetchMock.mockRejectedValueOnce(new Error('network'));

    const promise = upstreamRequest({
      url: 'http://api.test/api/budget',
      requestId: 'req-7',
      maxTotalTimeMs: 50,
      timeoutMs: 1000,
    });

    jest.advanceTimersByTime(100);
    await expect(promise).rejects.toThrow(/(max total time|timed out)/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cleans up abort listeners after completion', async () => {
    const add = jest.fn();
    const remove = jest.fn();
    const signal = {
      aborted: false,
      addEventListener: add,
      removeEventListener: remove,
    } as unknown as AbortSignal;

    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ ok: true }, 200, {
        'content-type': 'application/json',
      }),
    );

    await upstreamRequest({
      url: 'http://api.test/api/cleanup',
      requestId: 'req-4',
      signal,
    });

    expect(add).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('removes abort listener on errors', async () => {
    const add = jest.fn();
    const remove = jest.fn();
    const signal = {
      aborted: false,
      addEventListener: add,
      removeEventListener: remove,
    } as unknown as AbortSignal;

    fetchMock.mockRejectedValueOnce(new Error('boom'));

    await expect(
      upstreamRequest({
        url: 'http://api.test/api/error',
        requestId: 'req-5',
        signal,
      }),
    ).rejects.toBeInstanceOf(Error);

    expect(add).toHaveBeenCalledWith('abort', expect.any(Function), {
      once: true,
    });
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('does not set dispatcher by default', async () => {
    process.env.TENON_USE_FETCH_DISPATCHER = undefined;
    jest.resetModules();
    const localFetch = jest
      .fn()
      .mockResolvedValueOnce(mockJsonResponse({ ok: true }, 200));
    global.fetch = localFetch as unknown as typeof fetch;
    const { upstreamRequest: localUpstreamRequest } =
      await import('@/lib/server/bff');

    await localUpstreamRequest({
      url: 'http://api.test/api/dispatcher-default',
      requestId: 'req-6a',
    });

    const init = localFetch.mock.calls[0][1] as RequestInit & {
      dispatcher?: unknown;
    };
    expect(init.dispatcher).toBeUndefined();
  });

  it('passes dispatcher when opt-in enabled', async () => {
    process.env.TENON_USE_FETCH_DISPATCHER = '1';
    jest.resetModules();
    const localFetch = jest
      .fn()
      .mockResolvedValueOnce(mockJsonResponse({ ok: true }, 200));
    global.fetch = localFetch as unknown as typeof fetch;
    const { upstreamRequest: localUpstreamRequest } =
      await import('@/lib/server/bff');

    await localUpstreamRequest({
      url: 'http://api.test/api/dispatcher',
      requestId: 'req-6',
    });

    const init = localFetch.mock.calls[0][1] as RequestInit & {
      dispatcher?: unknown;
    };
    expect(init.dispatcher).toBeDefined();
  });
});
