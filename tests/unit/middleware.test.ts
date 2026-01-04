import { middleware, config as middlewareConfig } from '@/middleware';
import { CUSTOM_CLAIM_PERMISSIONS, CUSTOM_CLAIM_ROLES } from '@/lib/brand';

jest.mock('next/server', () => {
  const createCookies = () => {
    const jar: { name: string; value: string }[] = [];
    return {
      getAll: () => jar,
      set: (
        input: string | { name: string; value: string },
        value?: string,
      ) => {
        if (typeof input === 'string') {
          jar.push({ name: input, value: value ?? '' });
          return;
        }
        jar.push({ name: input.name, value: input.value });
      },
    };
  };

  const buildHeaders = (location?: string) => {
    const store = new Map<string, string>();
    if (location) store.set('location', location);
    return {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => store.set(key, value),
    };
  };

  const buildResponse = (status: number, location?: string) => ({
    status,
    headers: buildHeaders(location),
    cookies: createCookies(),
  });

  return {
    NextResponse: {
      redirect: (url: URL | string) => buildResponse(307, url.toString()),
      next: () => buildResponse(200),
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

  it('enables auth middleware on API routes via matcher config', () => {
    expect(middlewareConfig.matcher).toContain(
      '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    );
  });

  it('passes through API routes while still running auth middleware', async () => {
    const req = new NextRequest(new URL('http://localhost/api/simulations'));
    const res = await middleware(req);

    expect(mockAuth0.middleware).toHaveBeenCalledWith(req);
    expect(res?.status).toBe(200);
    expect(getSessionNormalizedMock).not.toHaveBeenCalled();
  });

  it('does not block /auth routes', async () => {
    const req = new NextRequest(new URL('http://localhost/auth/login'));
    const res = await middleware(req);

    expect(res?.status).toBe(200);
    expect(res?.headers.get('location')).toBeNull();
    expect(mockAuth0.middleware).toHaveBeenCalledWith(req);
  });

  it('redirects unauthenticated candidate dashboard to login with mode', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(
      new URL('http://localhost/candidate/dashboard'),
    );
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/login?returnTo=%2Fcandidate%2Fdashboard&mode=candidate',
    );
  });

  it('redirects unauthenticated recruiter dashboard to login with mode', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/login?returnTo=%2Fdashboard&mode=recruiter',
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

  it('redirects recruiters hitting candidate pages to not authorized', async () => {
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

  it('allows recruiter to load nested dashboard routes without bouncing to login', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['recruiter:access'] },
    });

    const req = new NextRequest(
      new URL('http://localhost/dashboard/simulations/new'),
    );
    const res = await middleware(req);

    expect(res?.status).toBe(200);
    expect(res?.headers.get('location')).toBeNull();
  });

  it('redirects missing session on nested recruiter routes to login with returnTo and mode', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(
      new URL('http://localhost/dashboard/simulations/new'),
    );
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/login?returnTo=%2Fdashboard%2Fsimulations%2Fnew&mode=recruiter',
    );
  });

  it('redirects recruiter routes to not authorized when recruiter permission missing', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['candidate:access'] },
    });

    const req = new NextRequest(
      new URL('http://localhost/dashboard/simulations/new'),
    );
    const res = await middleware(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/not-authorized?mode=recruiter&returnTo=%2Fdashboard%2Fsimulations%2Fnew',
    );
  });
});
