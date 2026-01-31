import { TextDecoder, TextEncoder } from 'util';
import { ReadableStream, WritableStream } from 'stream/web';
import { MessageChannel, MessagePort } from 'worker_threads';

// Provide encoding globals for undici in tests.
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
  class LocalResponse {
    status: number;
    ok: boolean;
    headers: {
      get: (name: string) => string | null;
      set?: (name: string, value: string) => void;
      delete?: (name: string) => void;
    };
    #body: unknown;

    constructor(body: unknown = '', init?: ResponseInit) {
      this.#body = body;
      this.status = init?.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
      const rawHeaders = init?.headers ?? {};
      this.headers = {
        get: (name: string) => {
          // @ts-expect-error loose lookup for tests
          return rawHeaders[name.toLowerCase()] ?? rawHeaders[name] ?? null;
        },
        set: (name: string, value: string) => {
          // @ts-expect-error mutate test headers
          rawHeaders[name.toLowerCase()] = value;
        },
        delete: () => {
          /* no-op for tests */
        },
      };
    }

    async json() {
      if (typeof this.#body === 'string') {
        return JSON.parse(this.#body || 'null');
      }
      return this.#body;
    }

    async text() {
      return typeof this.#body === 'string'
        ? this.#body
        : JSON.stringify(this.#body);
    }
  }

  if (typeof global.Response === 'undefined') {
    // @ts-expect-error assign test polyfill
    global.Response = LocalResponse;
  }

  class MockNextResponse extends LocalResponse {
    static json(body: unknown, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(body ?? null), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  return { NextResponse: MockNextResponse };
});

import { NextResponse } from 'next/server';
import {
  ensureAccessToken,
  forwardJson,
  getBackendBaseUrl,
  parseUpstreamBody,
} from '@/lib/server/bff';

const originalEnv = process.env.TENON_BACKEND_BASE_URL;

jest.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: jest.fn(),
  },
  getAccessToken: jest.fn(),
  getSessionNormalized: jest.fn(),
}));

const { getAccessToken, getSessionNormalized } =
  jest.requireMock('@/lib/auth0');

describe('bff helpers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.TENON_BACKEND_BASE_URL = 'http://api.test';
  });

  afterAll(() => {
    process.env.TENON_BACKEND_BASE_URL = originalEnv;
  });

  describe('getBackendBaseUrl', () => {
    it('strips trailing api segment and slashes', () => {
      process.env.TENON_BACKEND_BASE_URL = 'http://api.test/api///';
      expect(getBackendBaseUrl()).toBe('http://api.test');
    });
  });

  describe('parseUpstreamBody', () => {
    it('parses json bodies safely', async () => {
      const res = new Response(JSON.stringify({ message: 'hello' }), {
        headers: { 'content-type': 'application/json' },
      });
      await expect(parseUpstreamBody(res)).resolves.toEqual({
        message: 'hello',
      });
    });

    it('returns text for non-json', async () => {
      const res = new Response('plain text', {
        headers: { 'content-type': 'text/plain' },
      });
      await expect(parseUpstreamBody(res)).resolves.toBe('plain text');
    });

    it('returns undefined when json parse fails or text throws', async () => {
      const badJson = new Response('not-json', {
        headers: { 'content-type': 'application/json' },
      });
      await expect(parseUpstreamBody(badJson)).resolves.toBeUndefined();

      const badText = {
        headers: { get: () => 'text/plain' },
        text: async () => {
          throw new Error('fail');
        },
      } as unknown as Response;
      await expect(parseUpstreamBody(badText)).resolves.toBeUndefined();
    });
  });

  describe('ensureAccessToken', () => {
    const originalDebugAuth = process.env.TENON_DEBUG_AUTH;

    beforeEach(() => {
      delete process.env.TENON_DEBUG_AUTH;
    });

    afterEach(() => {
      if (originalDebugAuth === undefined) {
        delete process.env.TENON_DEBUG_AUTH;
      } else {
        process.env.TENON_DEBUG_AUTH = originalDebugAuth;
      }
    });

    it('returns 401 NextResponse when no session', async () => {
      getSessionNormalized.mockResolvedValue(null);

      const res = await ensureAccessToken();
      expect(res).toBeInstanceOf(NextResponse);
      if (res instanceof NextResponse) {
        expect(res.status).toBe(401);
      }
    });

    it('returns 401 NextResponse when token retrieval fails', async () => {
      getSessionNormalized.mockResolvedValue({ user: { sub: 'x' } });
      getAccessToken.mockRejectedValue(new Error('boom'));

      const res = await ensureAccessToken();
      expect(res).toBeInstanceOf(NextResponse);
      if (res instanceof NextResponse) {
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toMatchObject({ message: 'Not authenticated' });
      }
    });

    it('logs debug output when no session and debug enabled', async () => {
      process.env.TENON_DEBUG_AUTH = 'true';
      const debugSpy = jest
        .spyOn(console, 'debug')
        .mockImplementation(() => undefined);
      getSessionNormalized.mockResolvedValue(null);

      const res = await ensureAccessToken();
      expect(res).toBeInstanceOf(NextResponse);
      expect(debugSpy).toHaveBeenCalledWith('[auth] no session available');

      debugSpy.mockRestore();
    });

    it('returns 403 when required permission is missing', async () => {
      process.env.TENON_DEBUG_AUTH = 'true';
      const debugSpy = jest
        .spyOn(console, 'debug')
        .mockImplementation(() => undefined);
      getSessionNormalized.mockResolvedValue({
        user: { sub: 'x', permissions: [] },
      });

      const res = await ensureAccessToken('recruiter:access');
      expect(res).toBeInstanceOf(NextResponse);
      if (res instanceof NextResponse) {
        expect(res.status).toBe(403);
      }
      expect(debugSpy).toHaveBeenCalled();

      debugSpy.mockRestore();
    });

    it('returns access token payload when session and token available', async () => {
      getSessionNormalized.mockResolvedValue({ user: { sub: 'x' } });
      getAccessToken.mockResolvedValue('token-123');

      const res = await ensureAccessToken();
      expect(res).toEqual({ accessToken: 'token-123' });
    });
  });

  describe('forwardJson', () => {
    it('proxies request to backend with auth header and returns upstream body/status', async () => {
      process.env.TENON_BACKEND_BASE_URL = 'http://backend.example.com';
      const fetchMock = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const resp = await forwardJson({
        path: '/api/test',
        method: 'POST',
        headers: { 'X-Test': 'yes' },
        body: { hello: 'world' },
        accessToken: 'abc',
        cache: 'no-cache',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://backend.example.com/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ hello: 'world' }),
          cache: 'no-cache',
          redirect: 'manual',
        }),
      );
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const headers = init.headers as Headers;
      expect(headers.get('authorization')).toBe('Bearer abc');
      expect(headers.get('x-test')).toBe('yes');
      expect(headers.get('x-tenon-request-id')).toBeTruthy();

      expect(resp.status).toBe(201);
      const parsed = await resp.json();
      expect(parsed).toEqual({ ok: true });
    });
  });

  it('withAuthGuard short-circuits when auth is missing', async () => {
    getSessionNormalized.mockResolvedValue(null);
    const { withAuthGuard } = await import('@/lib/server/bff');

    const result = await withAuthGuard(async () =>
      NextResponse.json({ ok: true }),
    );

    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401);
    }
  });

  describe('robust upstreamRequest behavior', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('retries on retryable status and annotates response meta', async () => {
      const bad = new Response('bad', { status: 502 });
      // add cancel method to satisfy cleanup branch
      (bad as unknown as { body?: { cancel?: () => Promise<void> } }).body = {
        cancel: jest.fn().mockResolvedValue(undefined),
      };
      const good = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(bad as unknown as Response)
        .mockResolvedValueOnce(good as unknown as Response);
      global.fetch = fetchMock as unknown as typeof fetch;

      const { upstreamRequest } = await import('@/lib/server/bff');

      const resp = await upstreamRequest({
        url: 'https://api.test/data',
        requestId: 'req-1',
        timeoutMs: 200,
        maxTotalTimeMs: 1000,
        maxAttempts: 2,
        method: 'GET',
        headers: {},
      });

      expect(resp.status).toBe(200);
      expect(
        (resp as unknown as { _tenonMeta?: { attempts?: number } })._tenonMeta
          ?.attempts,
      ).toBe(2);
    });

    it('honors retry-after header on 429 responses', async () => {
      const first = new Response('rate', {
        status: 429,
        headers: { 'retry-after': '1' },
      });
      const second = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(first as unknown as Response)
        .mockResolvedValueOnce(second as unknown as Response);
      global.fetch = fetchMock as unknown as typeof fetch;
      const { upstreamRequest } = await import('@/lib/server/bff');

      const resp = await upstreamRequest({
        url: 'https://api.test/rate',
        requestId: 'req-3',
        timeoutMs: 500,
        maxTotalTimeMs: 2000,
        maxAttempts: 2,
        method: 'GET',
        headers: {},
      });

      expect(resp.status).toBe(200);
      expect(
        (resp as unknown as { _tenonMeta?: { attempts?: number } })._tenonMeta
          ?.attempts,
      ).toBe(2);
    });

    it('throws when a request times out', async () => {
      jest.useFakeTimers();
      global.fetch = jest.fn((_, init: RequestInit) => {
        const signal = init.signal as AbortSignal | undefined;
        return new Promise<Response>((_, reject) => {
          signal?.addEventListener('abort', () =>
            reject(signal.reason ?? new DOMException('Aborted', 'AbortError')),
          );
        });
      }) as unknown as typeof fetch;
      const { upstreamRequest } = await import('@/lib/server/bff');

      const promise = upstreamRequest({
        url: 'https://api.test/slow',
        requestId: 'req-2',
        timeoutMs: 5,
        maxAttempts: 1,
        method: 'GET',
        headers: {},
      });

      jest.runOnlyPendingTimers();
      await expect(promise).rejects.toThrow(/timed out/i);
    });

    it('aborts immediately when caller signal already aborted', async () => {
      const controller = new AbortController();
      controller.abort(new Error('caller-cancel'));
      global.fetch = jest.fn();
      const { upstreamRequest } = await import('@/lib/server/bff');

      await expect(
        upstreamRequest({
          url: 'https://api.test/abort',
          requestId: 'req-4',
          timeoutMs: 100,
          maxAttempts: 1,
          method: 'GET',
          headers: {},
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ message: 'caller-cancel' });
    });

    it('falls back to arrayBuffer cleanup when body cancel not available', async () => {
      const bad = new Response('bad', { status: 503 });
      const good = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
      // No body.cancel method
      (bad as unknown as { body?: unknown }).body = undefined;
      const arrayBufferMock = jest.fn().mockResolvedValue(new ArrayBuffer(0));
      (
        bad as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }
      ).arrayBuffer = arrayBufferMock;

      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(bad as unknown as Response)
        .mockResolvedValueOnce(good as unknown as Response);
      global.fetch = fetchMock as unknown as typeof fetch;

      const { upstreamRequest } = await import('@/lib/server/bff');

      const resp = await upstreamRequest({
        url: 'https://api.test/cleanup',
        requestId: 'req-cleanup',
        timeoutMs: 200,
        maxTotalTimeMs: 2000,
        maxAttempts: 2,
        method: 'GET',
        headers: {},
      });

      expect(resp.status).toBe(200);
      expect(arrayBufferMock).toHaveBeenCalled();
    });

    it('throws when maxTotalTimeMs budget is exceeded', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      const bad = new Response('bad', { status: 502 });
      (bad as unknown as { body?: { cancel?: () => Promise<void> } }).body = {
        cancel: jest.fn().mockResolvedValue(undefined),
      };

      global.fetch = jest.fn().mockResolvedValue(bad as unknown as Response);
      const { upstreamRequest } = await import('@/lib/server/bff');

      // Use a very short maxTotalTimeMs
      const promise = upstreamRequest({
        url: 'https://api.test/budget',
        requestId: 'req-budget',
        timeoutMs: 1000,
        maxTotalTimeMs: 1, // Very short budget
        maxAttempts: 3,
        method: 'GET',
        headers: {},
      });

      await expect(promise).rejects.toThrow(/max total time/i);
    });

    it('rethrows caller abort during retry wait', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      const controller = new AbortController();
      const bad = new Response('bad', { status: 503 });
      (bad as unknown as { body?: { cancel?: () => Promise<void> } }).body = {
        cancel: jest.fn().mockResolvedValue(undefined),
      };

      global.fetch = jest.fn().mockResolvedValue(bad as unknown as Response);
      const { upstreamRequest } = await import('@/lib/server/bff');

      const promise = upstreamRequest({
        url: 'https://api.test/abort-wait',
        requestId: 'req-abort-wait',
        timeoutMs: 500,
        maxTotalTimeMs: 5000,
        maxAttempts: 3,
        method: 'GET',
        headers: {},
        signal: controller.signal,
      });

      // Allow the first fetch to complete and start the retry wait
      await Promise.resolve();
      await Promise.resolve();

      // Abort during the wait
      controller.abort(new Error('user-cancelled'));
      jest.runOnlyPendingTimers();

      await expect(promise).rejects.toThrow(/user-cancelled/i);
    });
  });

  describe('testable helpers', () => {
    it('jitteredBackoffMs returns exponentially increasing delay', async () => {
      const { __testables } = await import('@/lib/server/bff');
      const { jitteredBackoffMs } = __testables;

      const delay1 = jitteredBackoffMs(1, 100, 1000);
      const delay2 = jitteredBackoffMs(2, 100, 1000);
      const delay3 = jitteredBackoffMs(3, 100, 1000);

      expect(delay1).toBeGreaterThanOrEqual(100);
      expect(delay1).toBeLessThanOrEqual(200);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('jitteredBackoffMs caps at max value', async () => {
      const { __testables } = await import('@/lib/server/bff');
      const { jitteredBackoffMs } = __testables;

      const delay = jitteredBackoffMs(10, 100, 500);
      expect(delay).toBeLessThanOrEqual(500);
    });

    it('parseRetryAfterMs parses numeric seconds', async () => {
      const { __testables } = await import('@/lib/server/bff');
      const { parseRetryAfterMs } = __testables;

      expect(parseRetryAfterMs('2', Date.now(), 5000)).toBe(2000);
      expect(parseRetryAfterMs('0', Date.now(), 5000)).toBeNull();
      expect(parseRetryAfterMs(null, Date.now(), 5000)).toBeNull();
    });

    it('parseRetryAfterMs parses date strings', async () => {
      const { __testables } = await import('@/lib/server/bff');
      const { parseRetryAfterMs } = __testables;

      const futureDate = new Date(Date.now() + 1500).toUTCString();
      const result = parseRetryAfterMs(futureDate, Date.now(), 5000);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(2000);
    });

    it('parseRetryAfterMs returns null for past dates', async () => {
      const { __testables } = await import('@/lib/server/bff');
      const { parseRetryAfterMs } = __testables;

      const pastDate = new Date(Date.now() - 1000).toUTCString();
      expect(parseRetryAfterMs(pastDate, Date.now(), 5000)).toBeNull();
    });

    it('waitWithAbort rejects immediately when signal already aborted', async () => {
      const { __testables } = await import('@/lib/server/bff');
      const { waitWithAbort } = __testables;

      const controller = new AbortController();
      controller.abort(new Error('pre-aborted'));

      await expect(waitWithAbort(1000, controller.signal)).rejects.toThrow(
        'pre-aborted',
      );
    });

    it('waitWithAbort rejects when signal aborts during wait', async () => {
      jest.useFakeTimers();
      const { __testables } = await import('@/lib/server/bff');
      const { waitWithAbort } = __testables;

      const controller = new AbortController();
      const promise = waitWithAbort(1000, controller.signal);

      controller.abort(new Error('mid-aborted'));
      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('mid-aborted');
    });
  });

  describe('forwardJson edge cases', () => {
    const originalDebugPerf = process.env.TENON_DEBUG_PERF;

    afterEach(() => {
      jest.resetModules();
      if (originalDebugPerf === undefined) {
        delete process.env.TENON_DEBUG_PERF;
      } else {
        process.env.TENON_DEBUG_PERF = originalDebugPerf;
      }
    });

    it('logs performance when DEBUG_PERF is enabled', async () => {
      jest.resetModules();
      process.env.TENON_DEBUG_PERF = 'true';
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const { forwardJson } = await import('@/lib/server/bff');
      await forwardJson({
        path: '/api/perf-test',
        method: 'GET',
        accessToken: 'tok',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[perf:bff]'),
      );
      logSpy.mockRestore();
    });

    it('passes string body without re-serializing', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const { forwardJson } = await import('@/lib/server/bff');
      await forwardJson({
        path: '/api/string-body',
        method: 'POST',
        body: '{"already":"serialized"}',
        accessToken: 'tok',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.body).toBe('{"already":"serialized"}');
    });

    it('respects caller-provided Content-Type header', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const { forwardJson } = await import('@/lib/server/bff');
      await forwardJson({
        path: '/api/custom-ct',
        method: 'POST',
        body: { data: 'test' },
        headers: { 'Content-Type': 'text/plain' },
        accessToken: 'tok',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const headers = fetchCall.headers as Headers;
      expect(headers.get('content-type')).toBe('text/plain');
    });

    it('logs error performance when request fails', async () => {
      jest.resetModules();
      process.env.TENON_DEBUG_PERF = 'true';
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

      const { forwardJson } = await import('@/lib/server/bff');
      await expect(
        forwardJson({
          path: '/api/error-test',
          method: 'POST', // Use POST to avoid retries
          accessToken: 'tok',
          timeoutMs: 100,
        }),
      ).rejects.toThrow('network error');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('error'));
      logSpy.mockRestore();
    });
  });
});
