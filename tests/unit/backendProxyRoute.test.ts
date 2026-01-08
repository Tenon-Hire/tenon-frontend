jest.mock('next/server', () => {
  const buildHeaders = (
    init?:
      | Record<string, string>
      | { forEach?: (cb: (value: string, key: string) => void) => void },
  ) => {
    const store = new Map<string, string>();
    if (init && typeof (init as { forEach?: unknown }).forEach === 'function') {
      (
        init as { forEach: (cb: (value: string, key: string) => void) => void }
      ).forEach((value, key) => store.set(key.toLowerCase(), value));
    } else {
      Object.entries((init as Record<string, string>) ?? {}).forEach(([k, v]) =>
        store.set(k.toLowerCase(), v),
      );
    }
    return {
      get: (key: string) => store.get(key.toLowerCase()) ?? null,
      set: (key: string, value: string) => store.set(key.toLowerCase(), value),
      delete: (key: string) => store.delete(key.toLowerCase()),
      forEach: (cb: (value: string, key: string) => void) => {
        store.forEach((value, key) => cb(value, key));
      },
    };
  };

  class FakeNextResponse {
    status: number;
    body: unknown;
    headers: ReturnType<typeof buildHeaders>;
    cookies: {
      set: (
        name: string | { name: string; value: string },
        value?: string,
      ) => void;
      getAll: () => { name: string; value: string }[];
    };

    constructor(body?: unknown, init?: { status?: number; headers?: unknown }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = buildHeaders(init?.headers as Record<string, string>);
      const cookieStore = new Map<string, { name: string; value: string }>();
      this.cookies = {
        set: (
          name: string | { name: string; value: string },
          value?: string,
        ) => {
          if (typeof name === 'object' && name !== null) {
            cookieStore.set(name.name, { name: name.name, value: name.value });
            return;
          }
          cookieStore.set(name, { name, value: value ?? '' });
        },
        getAll: () => Array.from(cookieStore.values()),
      };
    }

    static json(body: unknown, init?: { status?: number; headers?: unknown }) {
      return new FakeNextResponse(body, {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers as Record<string, string>),
        },
      });
    }
  }

  class FakeNextRequest {
    url: string;
    nextUrl: URL;
    headers: {
      get: (key: string) => string | null;
      forEach: (cb: (value: string, key: string) => void) => void;
    };
    method: string;
    private _body?: ArrayBuffer;
    signal: AbortSignal;
    constructor(
      url: URL | string,
      init?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string | ArrayBuffer;
      },
    ) {
      this.url = url.toString();
      this.nextUrl = new URL(this.url);
      this.method = init?.method ?? 'GET';
      this.signal = new AbortController().signal;
      const headerStore = new Map<string, string>();
      Object.entries(init?.headers ?? {}).forEach(([k, v]) =>
        headerStore.set(k.toLowerCase(), v),
      );
      if (init?.body) {
        this._body =
          typeof init.body === 'string'
            ? new TextEncoder().encode(init.body).buffer
            : (init.body as ArrayBuffer);
      }
      this.headers = {
        get: (key: string) => headerStore.get(key.toLowerCase()) ?? null,
        forEach: (cb: (value: string, key: string) => void) =>
          headerStore.forEach((v, k) => cb(v, k)),
      };
    }

    async arrayBuffer() {
      if (this._body) return this._body;
      return new ArrayBuffer(0);
    }
  }

  return {
    NextResponse: FakeNextResponse,
    NextRequest: FakeNextRequest,
  };
});

import { TextDecoder, TextEncoder } from 'util';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/backend/[...path]/route';
type FakeResponseShape = {
  body: unknown;
  status: number;
  headers: { get: (key: string) => string | null };
};

jest.mock('@/lib/server/bff', () => {
  const REQUEST_ID_HEADER = 'x-tenon-request-id';
  const parseUpstreamBody = jest.fn(async (res: Response) => {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        return await res.json();
      } catch {
        return undefined;
      }
    }
    try {
      return await res.text();
    } catch {
      return undefined;
    }
  });

  const upstreamRequest = jest.fn(
    async (options: {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: BodyInit | null;
      cache?: RequestCache;
      timeoutMs?: number;
      requestId: string;
      maxAttempts?: number;
    }) => {
      const method = (options.method ?? 'GET').toUpperCase();
      const retryable = method === 'GET' || method === 'HEAD';
      const attempts = retryable ? (options.maxAttempts ?? 3) : 1;
      let lastError: unknown;

      for (let attempt = 1; attempt <= attempts; attempt++) {
        const controller = new AbortController();
        let timedOut = false;
        const timeout = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, options.timeoutMs ?? 15000);

        const headers: Record<string, string> = {
          ...(options.headers ?? {}),
          [REQUEST_ID_HEADER]: options.requestId,
        };

        try {
          const resp = await fetch(options.url, {
            method,
            headers,
            body: options.body,
            cache: options.cache ?? 'no-store',
            redirect: 'manual',
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (
            retryable &&
            attempt < attempts &&
            (resp.status === 502 || resp.status === 503 || resp.status === 504)
          ) {
            await new Promise((resolve) => setTimeout(resolve, 10));
            continue;
          }
          return resp;
        } catch (err) {
          clearTimeout(timeout);
          if (timedOut) {
            throw new Error(
              `Request timed out after ${options.timeoutMs ?? 15000}ms`,
            );
          }
          if (!retryable || attempt >= attempts) throw err;
          lastError = err;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      throw lastError ?? new Error('Upstream failed');
    },
  );

  return {
    getBackendBaseUrl: jest.fn(() => 'https://backend.test'),
    parseUpstreamBody,
    resolveRequestId: jest.fn(() => 'req-test'),
    UPSTREAM_HEADER: 'x-tenon-upstream-status',
    REQUEST_ID_HEADER,
    upstreamRequest,
  };
});

const fetchMock = jest.fn();
const originalFetch = global.fetch;
const encoder = new TextEncoder();
const upstreamRequestMock = jest.requireMock('@/lib/server/bff')
  .upstreamRequest as jest.Mock;
const parseUpstreamBodyMock = jest.requireMock('@/lib/server/bff')
  .parseUpstreamBody as jest.Mock;

function mockResponse(
  body: string | ArrayBuffer,
  init: { status: number; headers?: Record<string, string> },
) {
  const headerStore = new Map<string, string>();
  Object.entries(init.headers ?? {}).forEach(([k, v]) =>
    headerStore.set(k.toLowerCase(), v),
  );
  return {
    status: init.status,
    headers: {
      get: (key: string) => headerStore.get(key.toLowerCase()) ?? null,
      forEach: (cb: (value: string, key: string) => void) =>
        headerStore.forEach((v, k) => cb(v, k)),
    },
    async json() {
      const text =
        typeof body === 'string'
          ? body
          : new TextDecoder().decode(body as ArrayBuffer);
      return JSON.parse(text);
    },
    async text() {
      return typeof body === 'string'
        ? body
        : new TextDecoder().decode(body as ArrayBuffer);
    },
    async arrayBuffer() {
      return typeof body === 'string'
        ? encoder.encode(body).buffer
        : (body as ArrayBuffer);
    },
  };
}

describe('/api/backend proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('passes through JSON responses and sets headers', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const res = await GET(
      new NextRequest('http://localhost/api/backend/foo?x=1') as never,
      { params: Promise.resolve({ path: ['foo'] }) },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.test/api/foo?x=1',
      expect.objectContaining({
        redirect: 'manual',
      }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const upstreamHeaders = init.headers as Headers | Record<string, string>;
    const requestId =
      typeof (upstreamHeaders as Headers).get === 'function'
        ? (upstreamHeaders as Headers).get('x-tenon-request-id')
        : (upstreamHeaders as Record<string, string>)['x-tenon-request-id'];
    expect(requestId).toBe('req-test');
    expect(res.status).toBe(200);
    expect((res as FakeResponseShape).body).toEqual({ ok: true });
    expect(res.headers.get('x-tenon-upstream-status')).toBe('200');
    expect(res.headers.get('x-tenon-request-id')).toBe('req-test');
  });

  it('threads request signal to upstream call', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const req = new NextRequest('http://localhost/api/backend/signal');
    await GET(req, { params: Promise.resolve({ path: ['signal'] }) });

    expect(upstreamRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ signal: req.signal }),
    );
  });

  it('passes through non-JSON content and preserves content-type', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse('plain body', {
        status: 201,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    const res = await GET(
      new NextRequest('http://localhost/api/backend/bar') as never,
      { params: Promise.resolve({ path: ['bar'] }) },
    );

    expect(res.status).toBe(201);
    const decoded = new TextDecoder().decode(
      (res as FakeResponseShape).body as ArrayBuffer,
    );
    expect(decoded).toBe('plain body');
    expect(res.headers.get('content-type')).toBe('text/plain');
    expect(res.headers.get('x-tenon-upstream-status')).toBe('201');
    expect(res.headers.get('x-tenon-request-id')).toBe('req-test');
  });

  it('returns stable error for invalid json without re-reading body', async () => {
    parseUpstreamBodyMock.mockClear();
    const reader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode('not-json'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    fetchMock.mockResolvedValueOnce({
      status: 200,
      headers: {
        get: (key: string) =>
          key.toLowerCase() === 'content-type' ? 'application/json' : null,
        forEach: (cb: (value: string, key: string) => void) => {
          cb('application/json', 'content-type');
        },
      },
      body: {
        getReader: () => reader,
        cancel: jest.fn(),
      },
      json: async () => ({}),
      text: async () => '{}',
    } as unknown as Response);

    const res = await GET(
      new NextRequest('http://localhost/api/backend/bad-json') as never,
      { params: Promise.resolve({ path: ['bad-json'] }) },
    );

    expect(res.status).toBe(200);
    expect((res as FakeResponseShape).body).toEqual({
      message: 'Invalid JSON from upstream',
    });
    expect(res.headers.get('x-tenon-request-id')).toBe('req-test');
    expect(parseUpstreamBodyMock).not.toHaveBeenCalled();
  });

  it('blocks upstream redirects and strips location header', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse('', {
        status: 302,
        headers: { location: 'https://example.com' },
      }),
    );

    const res = await GET(
      new NextRequest('http://localhost/api/backend/baz') as never,
      { params: Promise.resolve({ path: ['baz'] }) },
    );

    expect(res.status).toBe(502);
    expect((res as FakeResponseShape).body).toEqual({
      message: 'Upstream redirect blocked',
      upstreamStatus: 302,
    });
    expect(res.headers.get('x-tenon-upstream-status')).toBe('302');
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-tenon-request-id')).toBe('req-test');
  });

  it('retries GET on transient errors', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(JSON.stringify({}), { status: 503 }))
      .mockResolvedValueOnce(
        mockResponse(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const promise = GET(
      new NextRequest('http://localhost/api/backend/retry') as never,
      { params: Promise.resolve({ path: ['retry'] }) },
    );

    const res = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-tenon-upstream-status')).toBe('200');
  });

  it('returns 502 when upstream response content-length exceeds cap', async () => {
    const resp = mockResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'content-length': '5000000',
      },
    });
    const arrayBufferSpy = jest.spyOn(
      resp as unknown as { arrayBuffer: () => Promise<ArrayBuffer> },
      'arrayBuffer',
    );
    fetchMock.mockResolvedValueOnce(resp);

    const res = await GET(
      new NextRequest('http://localhost/api/backend/huge') as never,
      { params: Promise.resolve({ path: ['huge'] }) },
    );

    expect(res.status).toBe(502);
    expect(res.headers.get('x-tenon-request-id')).toBe('req-test');
    expect(arrayBufferSpy).not.toHaveBeenCalled();
  });

  it('returns 502 when streamed response exceeds cap', async () => {
    const bigChunk = new Uint8Array(2 * 1024 * 1024 + 10);
    const reader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({ done: false, value: bigChunk })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    const cancel = jest.fn();

    fetchMock.mockResolvedValueOnce({
      status: 200,
      headers: {
        get: (key: string) =>
          key.toLowerCase() === 'content-type' ? 'application/json' : null,
        forEach: (cb: (value: string, key: string) => void) => {
          cb('application/json', 'content-type');
        },
      },
      body: {
        getReader: () => reader,
        cancel,
      },
      json: async () => ({}),
      text: async () => '{}',
    } as unknown as Response);

    const res = await GET(
      new NextRequest('http://localhost/api/backend/huge-stream') as never,
      { params: Promise.resolve({ path: ['huge-stream'] }) },
    );

    expect(res.status).toBe(502);
    expect(res.headers.get('x-tenon-request-id')).toBe('req-test');
    expect(cancel).toHaveBeenCalled();
  });

  it('returns 413 when request body exceeds limit', async () => {
    const req = new NextRequest('http://localhost/api/backend/oversize', {
      method: 'POST',
      headers: { 'content-length': '5000000' },
    }) as never;
    const arrayBufferSpy = jest.fn(async () => new ArrayBuffer(0));
    (
      req as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }
    ).arrayBuffer = arrayBufferSpy;

    const res = await GET(req, {
      params: Promise.resolve({ path: ['oversize'] }),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toBe(413);
    expect(res.headers.get('x-tenon-request-id')).toBe('req-test');
    expect(arrayBufferSpy).not.toHaveBeenCalled();
  });

  it('times out and returns an error response', async () => {
    upstreamRequestMock.mockImplementationOnce(async () => {
      throw new Error('Request timed out after 20000ms');
    });

    const res = await GET(
      new NextRequest('http://localhost/api/backend/slow') as never,
      { params: Promise.resolve({ path: ['slow'] }) },
    );

    expect(res.status).toBe(502);
    expect((res as FakeResponseShape).body).toEqual(
      expect.objectContaining({ message: 'Upstream request failed' }),
    );
    expect(res.headers.get('x-tenon-request-id')).toBe('req-test');
  });
});
