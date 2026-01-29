import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

class SimpleHeaders {
  private store = new Map<string, string>();
  constructor(init?: Record<string, string>) {
    Object.entries(init ?? {}).forEach(([k, v]) => this.store.set(k, v));
  }
  get(key: string) {
    return this.store.get(key.toLowerCase()) ?? null;
  }
  set(key: string, value: string) {
    this.store.set(key.toLowerCase(), value);
  }
  delete(key: string) {
    this.store.delete(key.toLowerCase());
  }
  forEach(fn: (v: string, k: string) => void) {
    this.store.forEach((v, k) => fn(v, k));
  }
}

class SimpleResponse {
  status: number;
  headers: SimpleHeaders;
  body: string;
  constructor(body: string, init: { status: number; headers?: Record<string, string> }) {
    this.status = init.status;
    this.body = body;
    this.headers = new SimpleHeaders(init.headers);
  }
}

const GlobalResponse = SimpleResponse;

const buildResponse = (status = 200, location?: string) => {
  const headerStore = new Map<string, string>();
  if (location) headerStore.set('location', location);
  const cookieStore = new Map<string, { name: string; value: string }>();

  return {
    status,
    headers: {
      get: (key: string) => headerStore.get(key) ?? null,
      set: (key: string, value: string) => headerStore.set(key, value),
      delete: (key: string) => headerStore.delete(key),
    },
    cookies: {
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
      delete: (name: string) => cookieStore.delete(name),
      getAll: () => Array.from(cookieStore.values()),
    },
  };
};

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL | string) => buildResponse(307, url.toString()),
    json: (_body: unknown, init?: { status?: number; headers?: any }) => {
      const res = buildResponse(init?.status ?? 200);
      if (init?.headers) {
        Object.entries(init.headers).forEach(([k, v]) =>
          res.headers.set(k, String(v)),
        );
      }
      return res;
    },
    next: () => buildResponse(200),
  },
  NextRequest: class {
    url: string;
    nextUrl: URL;
    headers: Map<string, string>;
    method: string;
    signal: AbortSignal;
    constructor(url: URL | string, init?: { method?: string; headers?: any }) {
      this.url = url.toString();
      this.nextUrl = new URL(this.url);
      this.method = init?.method ?? 'GET';
      this.headers = new Map<string, string>();
      Object.entries(init?.headers ?? {}).forEach(([k, v]) =>
        this.headers.set(k.toLowerCase(), String(v)),
      );
      // @ts-expect-error AbortSignal minimal stub
      this.signal = { aborted: false };
    }
    get headersObj() {
      return this.headers;
    }
  },
}));

const mockRequireBffAuth = jest.fn();
const mockMergeResponseCookies = jest.fn();
jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: (...args: unknown[]) => mockRequireBffAuth(...args),
  mergeResponseCookies: (...args: unknown[]) => mockMergeResponseCookies(...args),
}));

const mockForwardJson = jest.fn();
const mockGetBackendBaseUrl = jest.fn(() => 'http://upstream');
const mockParseUpstreamBody = jest.fn(async () => ({}));
const mockUpstreamRequest = jest.fn();
const mockResolveRequestId = jest.fn(() => 'req-1');

jest.mock('@/lib/server/bff', () => ({
  forwardJson: (...args: unknown[]) => mockForwardJson(...args),
  getBackendBaseUrl: (...args: unknown[]) => mockGetBackendBaseUrl(...args),
  parseUpstreamBody: (...args: unknown[]) => mockParseUpstreamBody(...args),
  resolveRequestId: (...args: unknown[]) => mockResolveRequestId(...args),
  REQUEST_ID_HEADER: 'x-request-id',
  UPSTREAM_HEADER: 'x-upstream',
  upstreamRequest: (...args: unknown[]) => mockUpstreamRequest(...args),
}));

jest.mock('@/lib/auth0-claims', () => ({
  extractPermissions: jest.fn(() => ['p1', 'p2']),
}));

jest.mock('@/lib/auth0', () => ({
  getSessionNormalized: jest.fn(),
}));

describe('app/api auth token routes', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns access token when auth ok', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'abc',
      cookies: [],
    });
    const mod = await import('@/app/api/auth/access-token/route');
    const res = await mod.GET(new NextRequest('http://localhost/api/auth/access-token'));
    expect(res.status).toBe(200);
    expect(mockMergeResponseCookies).toHaveBeenCalled();
  });

  it('bubbles auth failure', async () => {
    const fail = NextResponse.json({ message: 'nope' }, { status: 401 });
    mockRequireBffAuth.mockResolvedValue({
      ok: false,
      response: fail,
      cookies: [],
    });
    const mod = await import('@/app/api/auth/access-token/route');
    const res = await mod.GET(new NextRequest('http://localhost/api/auth/access-token'));
    expect(res.status).toBe(401);
  });

  it('dev access-token mirrors auth flow', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'dev-token',
      cookies: [],
    });
    const mod = await import('@/app/api/dev/access-token/route');
    const res = await mod.GET(new NextRequest('http://localhost/api/dev/access-token'));
    expect(res.status).toBe(200);
  });
});

describe('debug/auth route', () => {
  let getSessionMock: jest.Mock;
  const modulePath = require.resolve(
    path.join(__dirname, '../../../../src/app/api/debug/auth/route'),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    getSessionMock = jest.requireMock('@/lib/auth0')
      .getSessionNormalized as jest.Mock;
    getSessionMock.mockResolvedValue({ user: null });
  });

  it('returns 404 in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = await new Promise<any>((resolve) => {
      jest.isolateModules(() => {
        const mod = require(modulePath);
        resolve(mod.GET());
      });
    });
    expect(res.status).toBe(404);
    process.env.NODE_ENV = prev;
  });

  it('returns 401 when not authenticated', async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await new Promise<any>((resolve) => {
      jest.isolateModules(() => {
        const mod = require(modulePath);
        resolve(mod.GET());
      });
    });
    expect(res.status).toBe(401);
  });

  it('returns permissions payload when authenticated', async () => {
    getSessionMock.mockResolvedValue({
      user: { email: 'a@test.com' },
      accessToken: 'tok',
    });
    const res = await new Promise<any>((resolve) => {
      jest.isolateModules(() => {
        const mod = require(modulePath);
        resolve(mod.GET());
      });
    });
    expect(res.status).toBe(200);
  });
});

describe('health route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns upstream health payload', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new GlobalResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as any;

    const mod = await import('@/app/api/health/route');
    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(mockParseUpstreamBody).toHaveBeenCalled();
  });

  it('blocks upstream redirects', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new GlobalResponse('', {
        status: 302,
        headers: { location: 'http://example.com' },
      }),
    ) as any;

    const mod = await import('@/app/api/health/route');
    const res = await mod.GET();
    expect(res.status).toBe(502);
    expect(res.headers.get('x-upstream')).toBe('302');
  });

  it('returns failure on fetch error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    const mod = await import('@/app/api/health/route');
    const res = await mod.GET();
    expect(res.status).toBe(503);
  });
});
