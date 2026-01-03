import { proxy } from '@/proxy';
import { CUSTOM_CLAIM_PERMISSIONS, CUSTOM_CLAIM_ROLES } from '@/lib/brand';

jest.mock('next/server', () => {
  const buildHeaders = (location?: string) => {
    const store = new Map<string, string>();
    if (location) store.set('location', location);
    return {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => store.set(key, value),
    };
  };

  return {
    NextResponse: {
      redirect: (url: URL | string) => ({
        status: 307,
        headers: buildHeaders(url.toString()),
      }),
      next: () => ({
        status: 200,
        headers: buildHeaders(),
      }),
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

describe('proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionNormalizedMock.mockReset();
    mockAuth0.getAccessToken.mockResolvedValue({ token: 'auth' });
  });

  it('redirects unauthenticated candidate dashboard to login with mode', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(
      new URL('http://localhost/candidate/dashboard'),
    );
    const res = await proxy(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/login?returnTo=%2Fcandidate%2Fdashboard&mode=candidate',
    );
  });

  it('redirects unauthenticated recruiter dashboard to login with mode', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await proxy(req);

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
    const res = await proxy(req);

    expect(res?.headers.get('location')).toBeNull();
    expect(mockAuth0.middleware).toHaveBeenCalled();
  });

  it('redirects candidates hitting recruiter pages to not authorized', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['candidate:access'] },
    });

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await proxy(req);

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
    const res = await proxy(req);

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
    const res = await proxy(req);

    expect(res?.status).toBe(200);
  });

  it('denies recruiter dashboard when user has candidate permission only', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { [CUSTOM_CLAIM_PERMISSIONS]: ['candidate:access'] },
    });

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await proxy(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/not-authorized');
  });

  it('maps roles to permissions allowing recruiter access', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { [CUSTOM_CLAIM_ROLES]: ['Recruiter'] },
    });

    const req = new NextRequest(new URL('http://localhost/dashboard'));
    const res = await proxy(req);

    expect(res?.status).toBe(200);
  });

  it('redirects recruiters hitting candidate pages to not authorized', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { permissions: ['recruiter:access'] },
    });

    const req = new NextRequest(
      new URL('http://localhost/candidate/dashboard'),
    );
    const res = await proxy(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe(
      'http://localhost/not-authorized?mode=candidate&returnTo=%2Fcandidate%2Fdashboard',
    );
  });
});
