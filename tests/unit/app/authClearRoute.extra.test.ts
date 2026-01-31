/**
 * Additional tests for auth clear route coverage
 */
import { NextRequest } from 'next/server';

jest.mock('next/server', () => {
  const { MockNextRequest } = jest.requireActual('../app/api/mockNext');
  const makeResp = (status: number, location?: string) => {
    const headers = new Map<string, string>();
    if (location) headers.set('location', location);
    const cookies: {
      name: string;
      value?: string;
      path?: string;
      domain?: string;
    }[] = [];
    return {
      status,
      headers,
      cookies: {
        set: (cookie: {
          name: string;
          value?: string;
          path?: string;
          domain?: string;
        }) => cookies.push(cookie),
        delete: (cookie: { name: string; path?: string; domain?: string }) =>
          cookies.push({ ...cookie, value: undefined }),
        getAll: () => cookies,
      },
    };
  };
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      redirect: (url: URL | string) => makeResp(307, url.toString()),
      json: (body: unknown, init?: { status?: number }) =>
        Object.assign(makeResp(init?.status ?? 200), { body }),
      next: () => makeResp(200),
    },
  };
});

jest.mock('@/lib/auth/authCookies', () => {
  const actual = jest.requireActual('@/lib/auth/authCookies');
  return {
    ...actual,
    isAuthCookie: jest.fn(
      (name: string) => name.startsWith('a0:') || name === 'appSession',
    ),
  };
});

jest.mock('@/lib/auth/routing', () => {
  const actual = jest.requireActual('@/lib/auth/routing');
  return {
    ...actual,
    sanitizeReturnTo: jest.fn((value?: string | null) => value?.trim() || '/'),
    modeForPath: jest.fn(() => 'candidate'),
  };
});

describe('auth clear route extra coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.TENON_AUTH0_COOKIE_DOMAIN;
    jest.resetModules();
  });

  it('ignores empty cookie domain env', async () => {
    process.env.TENON_AUTH0_COOKIE_DOMAIN = '   ';
    jest.resetModules();

    const { GET } = await import('@/app/(auth)/auth/clear/route');
    const req = new NextRequest('http://test.example.com/auth/clear');
    (
      req as unknown as {
        cookies: { getAll: () => Array<{ name: string; value: string }> };
      }
    ).cookies = {
      getAll: () => [{ name: 'appSession', value: '1' }],
    };

    const res = (await GET(req as unknown as NextRequest)) as {
      status: number;
      cookies: {
        getAll: () => Array<{ name: string; value?: string; domain?: string }>;
      };
    };

    // Should use hostname since env is whitespace
    const deleted = res.cookies.getAll();
    expect(deleted.some((c) => c.domain === 'test.example.com')).toBe(true);
  });

  it('handles returnTo with query string', async () => {
    const { GET } = await import('@/app/(auth)/auth/clear/route');
    const req = new NextRequest(
      'http://localhost/auth/clear?returnTo=%2Fdash%3Ffoo%3Dbar',
    );
    (req as unknown as { cookies: { getAll: () => unknown[] } }).cookies = {
      getAll: () => [],
    };
    const res = await GET(req as unknown as NextRequest);
    expect(res.headers.get('location')).toContain('returnTo=');
  });

  it('handles invalid mode param by inferring from path', async () => {
    const { GET } = await import('@/app/(auth)/auth/clear/route');
    const req = new NextRequest(
      'http://localhost/auth/clear?returnTo=%2F&mode=invalid',
    );
    (req as unknown as { cookies: { getAll: () => unknown[] } }).cookies = {
      getAll: () => [],
    };
    const res = await GET(req as unknown as NextRequest);
    // Should fall back to modeForPath which returns 'candidate'
    expect(res.headers.get('location')).toContain('mode=candidate');
  });

  it('handles candidate mode param', async () => {
    const { GET } = await import('@/app/(auth)/auth/clear/route');
    const req = new NextRequest(
      'http://localhost/auth/clear?returnTo=%2F&mode=candidate',
    );
    (req as unknown as { cookies: { getAll: () => unknown[] } }).cookies = {
      getAll: () => [],
    };
    const res = await GET(req as unknown as NextRequest);
    expect(res.headers.get('location')).toContain('mode=candidate');
  });
});
