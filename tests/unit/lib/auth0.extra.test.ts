/**
 * Additional tests for lib/auth0 to close coverage gaps
 */
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
  middleware: jest.fn(async () => NextResponse.next()),
  getSession: jest.fn(),
  getAccessToken: jest.fn(),
};

const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

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

describe('lib/auth0 extra coverage', () => {
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
    consoleWarnSpy.mockRestore();
  });

  it('uses fallback error ID when crypto.randomUUID unavailable', async () => {
    const originalCrypto = global.crypto;
    // @ts-expect-error mock crypto
    global.crypto = { randomUUID: undefined };

    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    const resp = await config.onCallback(
      { code: 'test_error' },
      { returnTo: '/test' },
    );

    expect(resp.status).toBe(307);
    // Error ID should be present (fallback format: auth-xxx-xxx)
    expect(resp.headers.get('location')).toMatch(/errorId=/);

    global.crypto = originalCrypto;
  });

  it('verifies Auth0Client is constructed with expected config', async () => {
    await import('@/lib/auth0');

    expect(Auth0ClientMock).toHaveBeenCalled();
    const config = Auth0ClientMock.mock.calls[0][0];
    expect(config.appBaseUrl).toBe('http://localhost:3000');
    expect(config.signInReturnToPath).toBe('/dashboard');
  });

  it('handles getCachedSessionNormalized', async () => {
    mockAuth0Instance.getSession.mockResolvedValue({
      user: { sub: 'cached-user' },
    });

    const { getCachedSessionNormalized } = await import('@/lib/auth0');

    const session = await getCachedSessionNormalized();
    expect(session?.user?.normalized).toBe(true);
  });

  it('handles normalizeAccessToken with object containing accessToken', async () => {
    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    const payload = Buffer.from(
      JSON.stringify({ permissions: ['nested:perm'] }),
    ).toString('base64url');

    const session = {
      user: {},
      accessToken: {
        accessToken: `header.${payload}.sig`,
      },
    };

    const result = await config.beforeSessionSaved(session, 'invalid');
    expect(result.user.permissions).toContain('nested:perm');
  });

  it('handles parsePermissionsString with complex separators', async () => {
    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    const payload = Buffer.from(
      JSON.stringify({
        'https://tenon.ai/permissions_str': '  a , b   c,d,,e  ',
      }),
    ).toString('base64url');

    const session = { user: {} };
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user.permissions).toEqual(
      expect.arrayContaining(['a', 'b', 'c', 'd', 'e']),
    );
  });

  it('handles roles that include both recruiter and candidate keywords', async () => {
    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    const payload = Buffer.from(
      JSON.stringify({ roles: ['RecruiterCandidate'] }),
    ).toString('base64url');

    const session = { user: {} };
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user.permissions).toContain('recruiter:access');
    expect(result.user.permissions).toContain('candidate:access');
  });

  it('preserves existing custom claim permissions', async () => {
    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    const session = {
      user: {
        'https://tenon.ai/permissions': ['existing:custom'],
        permissions: [],
      },
    };

    const result = await config.beforeSessionSaved(session, 'x.e30.y');
    expect(result.user.permissions).toContain('existing:custom');
    expect(result.user['https://tenon.ai/permissions']).toContain(
      'existing:custom',
    );
  });

  it('merges custom claim roles to session', async () => {
    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    const payload = Buffer.from(
      JSON.stringify({ roles: ['TokenRole'] }),
    ).toString('base64url');

    const session = { user: {} };
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);

    expect(result.user['https://tenon.ai/roles']).toContain('TokenRole');
  });

  it('handles non-Error object in toSafeErrorMessage', async () => {
    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    // Error with no message property
    const resp = await config.onCallback({ code: 'test' }, { returnTo: '/' });
    expect(resp.status).toBe(307);
  });

  it('handles empty permissions in normalizedPerms fallback', async () => {
    await import('@/lib/auth0');
    const config = Auth0ClientMock.mock.calls[0][0];

    const session = {
      user: {
        permissions: [], // Empty user permissions
      },
    };

    // Empty token too
    const payload = Buffer.from(JSON.stringify({})).toString('base64url');
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);

    // Should keep the empty array
    expect(result.user.permissions).toEqual([]);
  });
});
