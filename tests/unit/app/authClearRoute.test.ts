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

describe('auth clear route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears auth cookies and sets domain when configured', async () => {
    process.env.TENON_AUTH0_COOKIE_DOMAIN = 'tenon.dev';
    const { GET } = await import('@/app/(auth)/auth/clear/route');
    const req = new NextRequest(
      'http://localhost/auth/clear?returnTo=%2Fdash&mode=recruiter',
    );
    (
      req as unknown as {
        cookies: { getAll: () => Array<{ name: string; value: string }> };
      }
    ).cookies = {
      getAll: () => [
        { name: 'appSession', value: '1' },
        { name: 'a0:state', value: '2' },
        { name: 'other', value: 'x' },
      ],
    };

    const res = (await GET(req as unknown as NextRequest)) as {
      status: number;
      cookies: { getAll: () => Array<{ name: string; value?: string }> };
    };
    expect(res.status).toBe(307);
    const deleted = res.cookies.getAll().map((c) => c.name);
    expect(deleted).toEqual(expect.arrayContaining(['appSession', 'a0:state']));
    process.env.TENON_AUTH0_COOKIE_DOMAIN = undefined;
  });

  it('falls back to mode derived from returnTo when param missing', async () => {
    const { GET } = await import('@/app/(auth)/auth/clear/route');
    const req = new NextRequest(
      'http://localhost/auth/clear?returnTo=%2Fcandidate%2Fdashboard',
    );
    (req as unknown as { cookies: { getAll: () => unknown[] } }).cookies = {
      getAll: () => [],
    };
    const res = await GET(req as unknown as NextRequest);
    expect(res.headers.get('location')).toContain('mode=candidate');
  });
});
