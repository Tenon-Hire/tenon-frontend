import { middleware } from '@/middleware';
import { CUSTOM_CLAIM_PERMISSIONS, CUSTOM_CLAIM_ROLES } from '@/lib/brand';

jest.mock('next/server', () => {
  const buildResponse = (status = 200, location?: string) => {
    const headerStore = new Map<string, string>();
    if (location) headerStore.set('location', location);
    const cookieStore = new Map<string, { name: string; value: string }>();

    return {
      status,
      headers: {
        get: (key: string) => headerStore.get(key) ?? null,
        set: (key: string, value: string) => headerStore.set(key, value),
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
        getAll: () => Array.from(cookieStore.values()),
      },
    };
  };

  return {
    NextResponse: {
      redirect: (url: URL | string) => buildResponse(307, url.toString()),
      next: () => buildResponse(200),
      json: (_body: unknown, init?: { status?: number }) =>
        buildResponse(init?.status ?? 200),
    },
    NextRequest: class {
      url: string;
      nextUrl: URL;
      constructor(url: URL | string) {
        this.url = url.toString();
        this.nextUrl = new URL(this.url);
      }
    },
  };
});

import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/auth0', () => ({
  auth0: {
    middleware: jest.fn(() => NextResponse.next()),
    getSession: jest.fn(),
    getAccessToken: jest.fn(),
  },
  getSessionNormalized: jest.fn(),
}));

const mockAuth0 = jest.requireMock('@/lib/auth0').auth0 as {
  middleware: jest.Mock;
  getSession: jest.Mock;
  getAccessToken: jest.Mock;
};
const getSessionNormalizedMock = jest.requireMock('@/lib/auth0')
  .getSessionNormalized as jest.Mock;

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionNormalizedMock.mockReset();
    mockAuth0.getAccessToken.mockResolvedValue({ token: 'auth' });
  });

  it('allows public home when logged out', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);
    const req = new NextRequest(new URL('http://localhost/'));
    const res = await middleware(req);
    expect(res?.status).toBe(200);
    expect(res?.headers.get('location')).toBeNull();
  });

  it('handles non-NextResponse auth middleware output gracefully', async () => {
    mockAuth0.middleware.mockResolvedValue(null);
    getSessionNormalizedMock.mockResolvedValue(null);
    const req = new NextRequest(new URL('http://localhost/'));
    const res = await middleware(req);
    expect(res?.status).toBe(200);
  });

  it('returns next for API routes and preserves auth cookies', async () => {
    const apiReq = new NextRequest(new URL('http://localhost/api/simulations'));
    const authResp = NextResponse.next();
    authResp.cookies.set('a', 'b');
    mockAuth0.middleware.mockResolvedValue(authResp);
    getSessionNormalizedMock.mockResolvedValue(null);

    const res = await middleware(apiReq);

    expect(res?.status).toBe(200);
    expect(res?.headers.get('location')).toBeNull();
    expect(res?.cookies.getAll().find((c) => c.name === 'a')?.value).toBe('b');
  });

  it('returns next for bare /api and does not redirect', async () => {
    const apiReq = new NextRequest(new URL('http://localhost/api'));
    const authResp = NextResponse.next();
    authResp.cookies.set('api', 'root');
    mockAuth0.middleware.mockResolvedValue(authResp);
    getSessionNormalizedMock.mockResolvedValue(null);

    const res = await middleware(apiReq);

    expect(res?.status).toBe(200);
    expect(res?.headers.get('location')).toBeNull();
    expect(res?.cookies.getAll().find((c) => c.name === 'api')?.value).toBe(
      'root',
    );
    expect(getSessionNormalizedMock).not.toHaveBeenCalled();
  });

  it('treats /apiary as non-api and applies auth gating', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);
    const req = new NextRequest(new URL('http://localhost/apiary'));
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/auth/login');
  });

  it('merges cookies on redirect responses', async () => {
    const authResp = NextResponse.next();
    authResp.cookies.set('edge', 'set');
    mockAuth0.middleware.mockResolvedValue(authResp);
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.cookies.getAll().find((c) => c.name === 'edge')?.value).toBe(
      'set',
    );
  });

  it('normalizes /auth/logout by adding root returnTo when missing (no session lookup)', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);
    const req = new NextRequest(new URL('http://localhost/auth/logout'));
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/auth/logout?returnTo=http%3A%2F%2Flocalhost%2F',
    );
    expect(getSessionNormalizedMock).not.toHaveBeenCalled();
  });

  it('normalizes logout returnTo to same-origin root', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);
    const req = new NextRequest(
      new URL(
        'http://localhost/auth/logout?returnTo=https%3A%2F%2Fevil.com%2Fphish',
      ),
    );
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/auth/logout?returnTo=http%3A%2F%2Flocalhost%2F',
    );
  });

  it('normalizes relative logout returnTo to root-only', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);
    const req = new NextRequest(
      new URL('http://localhost/auth/logout?returnTo=%2Fdashboard'),
    );
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/auth/logout?returnTo=http%3A%2F%2Flocalhost%2F',
    );
  });

  it('normalizes same-origin absolute logout returnTo to root-only', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);
    const req = new NextRequest(
      new URL(
        'http://localhost/auth/logout?returnTo=http%3A%2F%2Flocalhost%2Fdashboard',
      ),
    );
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/auth/logout?returnTo=http%3A%2F%2Flocalhost%2F',
    );
  });

  it('does not issue a normalization redirect when logout returnTo is already root', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);
    const req = new NextRequest(
      new URL(
        'http://localhost/auth/logout?returnTo=http%3A%2F%2Flocalhost%2F',
      ),
    );
    const res = await middleware(req);
    expect(res?.headers.get('location')).toBeNull();
  });

  it('allows auth login public route when logged out preserving query', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);
    const req = new NextRequest(
      new URL(
        'http://localhost/auth/login?mode=recruiter&returnTo=%2Fdashboard',
      ),
    );
    const res = await middleware(req);
    expect(res?.status).toBe(200);
    expect(res?.headers.get('location')).toBeNull();
  });

  it('redirects logged-in recruiter hitting auth login to dashboard', async () => {
    const authResp = NextResponse.next();
    authResp.cookies.set('edge', 'cookie');
    mockAuth0.middleware.mockResolvedValue(authResp);
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['recruiter:access'] },
      accessToken: 't',
    });

    const req = new NextRequest(new URL('http://localhost/auth/login'));
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost/dashboard');
    expect(res?.cookies.getAll().find((c) => c.name === 'edge')?.value).toBe(
      'cookie',
    );
  });

  it('redirects logged-in candidate hitting auth login to candidate dashboard', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['candidate:access'] },
      accessToken: 't',
    });

    const req = new NextRequest(new URL('http://localhost/auth/login'));
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/candidate/dashboard',
    );
  });

  it('redirects unauthenticated candidate dashboard access to login', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(
      new URL('http://localhost/candidate/dashboard'),
    );
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/auth/login?mode=candidate&returnTo=%2Fcandidate%2Fdashboard',
    );
    expect(getSessionNormalizedMock).toHaveBeenCalled();
  });

  it('redirects unauthenticated recruiter dashboard to login with mode', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/auth/login?mode=recruiter&returnTo=%2Fdashboard',
    );
  });

  it('sends authorized candidates through candidate routes', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['candidate:access'] },
    });

    const req = new NextRequest(
      new URL('http://localhost/candidate/session/tok_123'),
    );
    const res = await middleware(req);

    expect(res?.headers.get('location')).toBeNull();
    expect(mockAuth0.middleware).toHaveBeenCalled();
  });

  it('allows authenticated users without recruiter access to hit candidate routes', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: [] },
    });

    const req = new NextRequest(
      new URL('http://localhost/candidate/session/tok_123'),
    );
    const res = await middleware(req);

    expect(res?.headers.get('location')).toBeNull();
  });

  it('allows dual-permission users to access candidate routes', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['recruiter:access', 'candidate:access'] },
    });

    const req = new NextRequest(
      new URL('http://localhost/candidate/session/tok_123'),
    );
    const res = await middleware(req);

    expect(res?.headers.get('location')).toBeNull();
  });

  it('redirects candidates hitting recruiter pages to not authorized', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['candidate:access'] },
    });

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/not-authorized?mode=recruiter&returnTo=%2Fdashboard',
    );
  });

  it('redirects empty-permission users hitting recruiter pages to not authorized', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: [] },
    });

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/not-authorized?mode=recruiter&returnTo=%2Fdashboard',
    );
  });

  it('allows recruiter when permissions claim present on user', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { [CUSTOM_CLAIM_PERMISSIONS]: ['recruiter:access'] },
    });

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await middleware(req);

    expect(res?.status).toBe(200);
  });

  it('allows recruiter when standard permissions are empty but namespaced exist', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: {
        permissions: [],
        [CUSTOM_CLAIM_PERMISSIONS]: ['recruiter:access'],
      },
    });

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await middleware(req);

    expect(res?.status).toBe(200);
  });

  it('denies recruiter dashboard when user has candidate permission only', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { [CUSTOM_CLAIM_PERMISSIONS]: ['candidate:access'] },
    });

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/not-authorized');
  });

  it('maps roles to permissions allowing recruiter access', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { [CUSTOM_CLAIM_ROLES]: ['Recruiter'] },
    });

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await middleware(req);

    expect(res?.status).toBe(200);
  });

  it('blocks recruiters from accessing candidate pages', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['recruiter:access'] },
    });

    const req = new NextRequest(
      new URL('http://localhost/candidate/dashboard'),
    );
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/not-authorized?mode=candidate&returnTo=%2Fcandidate%2Fdashboard',
    );
  });

  it('logs perf timing and normalizes access token objects', async () => {
    const prevEnv = process.env.TENON_DEBUG_PERF;
    process.env.TENON_DEBUG_PERF = 'true';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['candidate:access'] },
      accessToken: { token: 'nested-token' },
    });

    const req = new NextRequest(new URL('http://localhost/candidate/notes'));
    const res = await middleware(req);

    expect(res?.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    process.env.TENON_DEBUG_PERF = prevEnv;
  });

  it('passes through other /auth/* pages without extra redirects', async () => {
    const authResp = NextResponse.next();
    authResp.cookies.set('persist', '1');
    mockAuth0.middleware.mockResolvedValue(authResp);
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(new URL('http://localhost/auth/clear'));
    const res = await middleware(req);

    expect(res?.status).toBe(200);
    expect(res?.cookies.getAll().find((c) => c.name === 'persist')?.value).toBe(
      '1',
    );
  });

  it('redirects root visitors with recruiter access to dashboard using normalized accessToken field', async () => {
    const authResp = NextResponse.next();
    authResp.cookies.set('edge', 'cookie');
    mockAuth0.middleware.mockResolvedValue(authResp);
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['recruiter:access'] },
      accessToken: { accessToken: 'root-token' },
    });

    const req = new NextRequest(new URL('http://localhost/'));
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost/dashboard');
    expect(res?.cookies.getAll().find((c) => c.name === 'edge')?.value).toBe(
      'cookie',
    );
  });

  it('lets unknown auth paths skip auth and return next response', async () => {
    const authResp = NextResponse.next();
    authResp.cookies.set('auth', 'pass');
    mockAuth0.middleware.mockResolvedValue(authResp);
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(new URL('http://localhost/auth/reset'));
    const res = await middleware(req);

    expect(res?.status).toBe(200);
    expect(res?.cookies.getAll().find((c) => c.name === 'auth')?.value).toBe(
      'pass',
    );
  });

  it('returns next when recruiter is authorized for dashboard', async () => {
    const authResp = NextResponse.next();
    authResp.cookies.set('edge', 'cookie');
    mockAuth0.middleware.mockResolvedValue(authResp);
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['recruiter:access'] },
      accessToken: 'abc',
    });

    const req = new NextRequest(new URL('http://localhost/dashboard/overview'));
    const res = await middleware(req);

    expect(res?.status).toBe(200);
    expect(res?.cookies.getAll().find((c) => c.name === 'edge')?.value).toBe(
      'cookie',
    );
  });
});
