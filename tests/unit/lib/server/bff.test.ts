jest.mock('next/server', () => {
  class LocalResponse {
    status: number;
    ok: boolean;
    headers: { get: (name: string) => string | null };
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
    getAccessToken: jest.fn(),
  },
}));

const mockAuth0 = jest.requireMock('@/lib/auth0').auth0 as unknown as {
  getAccessToken: jest.Mock;
};
const { getAccessToken } = mockAuth0;

describe('bff helpers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.TENON_BACKEND_BASE_URL = 'http://api.test';
    (global.fetch as jest.Mock | undefined) = jest.fn();
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
    it('returns 401 NextResponse when token retrieval fails', async () => {
      getAccessToken.mockRejectedValue(new Error('boom'));
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(null, { status: 404 }),
      );

      const res = await ensureAccessToken();
      expect(getAccessToken).toHaveBeenCalledTimes(2);
      expect(res).toBeInstanceOf(NextResponse);
      if (res instanceof NextResponse) {
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toEqual({ error: 'unauthorized' });
      }
    });

    it('returns access token payload when refresh attempt succeeds', async () => {
      getAccessToken
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ token: 'token-123' });
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(null, { status: 404 }),
      );

      const res = await ensureAccessToken();
      expect(getAccessToken).toHaveBeenCalledTimes(2);
      expect(getAccessToken).toHaveBeenLastCalledWith({ refresh: true });
      expect(res).toEqual({ accessToken: 'token-123' });
    });

    it('returns access token payload when first call succeeds', async () => {
      getAccessToken.mockResolvedValue('token-abc');

      const res = await ensureAccessToken();
      expect(res).toEqual({ accessToken: 'token-abc' });
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
        {
          method: 'POST',
          headers: { Authorization: 'Bearer abc', 'X-Test': 'yes' },
          body: JSON.stringify({ hello: 'world' }),
          cache: 'no-cache',
        },
      );

      expect(resp.status).toBe(201);
      const parsed = await resp.json();
      expect(parsed).toEqual({ ok: true });
    });
  });

  it('withAuthGuard short-circuits when auth is missing', async () => {
    getAccessToken.mockRejectedValue(new Error('missing'));
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(null, { status: 404 }),
    );
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
