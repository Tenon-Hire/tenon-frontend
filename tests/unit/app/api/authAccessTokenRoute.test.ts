jest.mock('next/server', () => {
  class SimpleNextRequest {
    nextUrl: URL;
    constructor(public url: string) {
      this.nextUrl = new URL(url);
    }
  }
  return {
    NextRequest: SimpleNextRequest,
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => {
        return {
          status: init?.status ?? 200,
          json: async () => body,
          headers: {
            get: () => null,
            set: () => undefined,
            delete: () => undefined,
          },
          cookies: { set: () => undefined, getAll: () => [] },
        };
      },
    },
  };
});

import { GET } from '@/app/api/auth/access-token/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: jest.fn(async () => ({
    ok: true,
    accessToken: 'token-1',
    cookies: [],
    response: null,
  })),
  mergeResponseCookies: jest.fn(),
}));

class MockResponse {
  status: number;
  #body: string;
  headers: Map<string, string>;
  constructor(
    body: unknown,
    init?: { status?: number; headers?: Record<string, string> },
  ) {
    this.status = init?.status ?? 200;
    this.#body = typeof body === 'string' ? body : JSON.stringify(body);
    this.headers = new Map(Object.entries(init?.headers ?? {}));
  }
  async json() {
    return JSON.parse(this.#body);
  }
}

describe('auth/access-token route', () => {
  it('returns token json when auth succeeds', async () => {
    const req = new NextRequest('http://localhost/api/auth/access-token');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ accessToken: 'token-1' });
  });

  it('passes through auth failure response', async () => {
    const requireBffAuth = jest.requireMock('@/lib/server/bffAuth')
      .requireBffAuth as jest.Mock;
    requireBffAuth.mockResolvedValueOnce({
      ok: false,
      response: new MockResponse(
        { message: 'nope' },
        {
          status: 401,
          headers: { 'content-type': 'application/json' },
        },
      ),
      cookies: [],
    });
    const req = new NextRequest('http://localhost/api/auth/access-token');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ message: 'nope' });
  });
});
