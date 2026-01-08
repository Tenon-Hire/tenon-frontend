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
});
