const originalEnv = { ...process.env };

jest.mock('next/server', () => {
  const buildResponse = (status = 200, location?: string) => {
    const headers = new Map<string, string>();
    if (location) headers.set('location', location);
    const cookies = new Map<string, { name: string; value: string }>();
    return {
      status,
      headers: {
        get: (k: string) => headers.get(k) ?? null,
        set: (k: string, v: string) => headers.set(k, v),
        delete: (k: string) => headers.delete(k),
      },
      cookies: {
        set: (
          name: string | { name: string; value: string },
          value?: string,
        ) => {
          if (typeof name === 'object') {
            cookies.set(name.name, { name: name.name, value: name.value });
            return;
          }
          cookies.set(name, { name, value: value ?? '' });
        },
        getAll: () => Array.from(cookies.values()),
      },
    };
  };
  return {
    NextResponse: {
      redirect: (url: URL | string) => buildResponse(307, url.toString()),
      json: (_body: unknown, init?: { status?: number }) =>
        buildResponse(init?.status ?? 200),
      next: () => buildResponse(200),
    },
    NextRequest: class {
      url: string;
      nextUrl: URL;
      constructor(url: string) {
        this.url = url;
        this.nextUrl = new URL(url);
      }
    },
  };
});

import { NextResponse } from 'next/server';

const mockAuth0Instance = {
  middleware: jest.fn(async (_req?: unknown) => NextResponse.next()),
  getSession: jest.fn(),
  getAccessToken: jest.fn(),
};

const Auth0ClientMock = jest.fn(() => mockAuth0Instance);

jest.mock('@auth0/nextjs-auth0/server', () => ({
  Auth0Client: Auth0ClientMock,
}));

jest.mock('@/lib/auth0-claims', () => {
  const actual = jest.requireActual('@/lib/auth0-claims');
  return {
    ...actual,
    normalizeUserClaims: (user: Record<string, unknown>) => ({
      ...user,
      normalized: true,
    }),
    extractPermissions: actual.extractPermissions,
  };
});

jest.mock('@/lib/auth/routing', () => {
  const actual = jest.requireActual('@/lib/auth/routing');
  return {
    ...actual,
    sanitizeReturnTo: jest.fn((v?: string | null) => v ?? '/'),
    modeForPath: jest.fn(() => 'candidate'),
  };
});

describe('lib/auth0 wrapper', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.assign(process.env, originalEnv, {
      TENON_AUTH0_SECRET: 's',
      TENON_AUTH0_DOMAIN: 'd',
      TENON_AUTH0_CLIENT_ID: 'cid',
      TENON_AUTH0_CLIENT_SECRET: 'cs',
      TENON_APP_BASE_URL: 'http://localhost:3000',
    });
  });

  afterAll(() => {
    Object.assign(process.env, originalEnv);
  });

  it('constructs Auth0 client with callbacks and normalizes session', async () => {
    const { auth0, getSessionNormalized } = await import('@/lib/auth0');

    expect(Auth0ClientMock).toHaveBeenCalled();
    const config = Auth0ClientMock.mock.calls[0][0];
    expect(config.authorizationParameters).toEqual(
      expect.objectContaining({ scope: process.env.TENON_AUTH0_SCOPE }),
    );

    mockAuth0Instance.getSession.mockResolvedValue({
      user: { permissions: ['p1'] },
      accessToken: 'jwt.token.here',
    });

    const session = await getSessionNormalized();
    expect(session?.user?.normalized).toBe(true);
  });

  it('handles callback errors by redirecting with sanitized params', async () => {
    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    const resp = await config.onCallback(
      { code: 'boom', message: 'bad callback' },
      { returnTo: '/dest' },
    );

    expect(resp.status).toBe(307);
    expect(resp.headers.get('location')).toContain('/auth/error?');
  });

  it('adds permissions/roles in beforeSessionSaved', async () => {
    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    const session = { user: { permissions: [] } };
    const payload = Buffer.from(
      JSON.stringify({ permissions: ['token:perm'], roles: ['Recruiter'] }),
    ).toString('base64url');
    const result = await config.beforeSessionSaved(
      session,
      `x.${payload}.y`,
    );
    expect(result.user.permissions).toContain('token:perm');
    expect(result.user.roles).toContain('Recruiter');
  });

  it('falls back to stub auth when env missing', async () => {
    delete process.env.TENON_AUTH0_SECRET;
    const { auth0, getAccessToken } = await import('@/lib/auth0');

    await expect(auth0.middleware()).resolves.toBeDefined();
    await expect(getAccessToken()).rejects.toThrow(/Auth0 env vars are missing/);
  });
});
