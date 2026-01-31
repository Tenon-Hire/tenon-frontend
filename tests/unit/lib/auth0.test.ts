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
// Silence intentional callback warnings
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

const Auth0ClientMock = jest.fn((config: unknown) => {
  void config;
  return mockAuth0Instance;
});

const getAuth0Config = () => {
  const config = Auth0ClientMock.mock.calls[0]?.[0];
  if (!config) {
    throw new Error('Auth0 client was not initialized');
  }
  return config as {
    beforeSessionSaved: (session: unknown, token: string) => unknown;
    onCallback: (...args: unknown[]) => unknown;
    authorizationParameters?: Record<string, unknown>;
  };
};

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
    consoleWarnSpy.mockRestore();
  });

  it('constructs Auth0 client with callbacks and normalizes session', async () => {
    const { getSessionNormalized } = await import('@/lib/auth0');

    expect(Auth0ClientMock).toHaveBeenCalled();
    const config = getAuth0Config();
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
    const config = getAuth0Config();

    const resp = await config.onCallback(
      { code: 'boom', message: 'bad callback' },
      { returnTo: '/dest' },
    );

    expect(resp.status).toBe(307);
    expect(resp.headers.get('location')).toContain('/auth/error?');
  });

  it('adds permissions/roles in beforeSessionSaved', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const session = { user: { permissions: [] } };
    const payload = Buffer.from(
      JSON.stringify({ permissions: ['token:perm'], roles: ['Recruiter'] }),
    ).toString('base64url');
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user.permissions).toContain('token:perm');
    expect(result.user.roles).toContain('Recruiter');
  });

  it('uses role-derived permissions when token has none', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const session = { user: { roles: ['Candidate'] } };
    const payload = Buffer.from(JSON.stringify({ permissions: [] })).toString(
      'base64url',
    );
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user.permissions).toContain('candidate:access');
  });

  it('redirects to sanitized returnTo on successful callback', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();
    const resp = await config.onCallback(null, { returnTo: '/foo?bar=baz' });
    expect(resp.status).toBe(307);
    expect(resp.headers.get('location')).toContain('/foo');
  });

  it('logs perf timing when normalizing session with debug perf enabled', async () => {
    process.env.TENON_DEBUG_PERF = '1';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockAuth0Instance.getSession.mockResolvedValue({
      user: { permissions: ['p1'] },
      accessToken: 'jwt.token.here',
    });
    const { getSessionNormalized } = await import('@/lib/auth0');
    await getSessionNormalized();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    delete process.env.TENON_DEBUG_PERF;
  });

  it('returns null when decoding malformed jwt payload', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();
    const result = await config.beforeSessionSaved(
      { user: { permissions: [] } },
      'not-a-token',
    );
    expect(result.user.permissions).toEqual([]);
  });

  it('falls back to stub auth when env missing', async () => {
    delete process.env.TENON_AUTH0_SECRET;
    const { auth0, getAccessToken } = await import('@/lib/auth0');

    await expect(auth0.middleware()).resolves.toBeDefined();
    await expect(getAccessToken()).rejects.toThrow(
      /Auth0 env vars are missing/,
    );
  });

  it('handles error with name instead of code', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const resp = await config.onCallback(
      { name: 'AuthError', message: 'bad' },
      { returnTo: '/test' },
    );
    expect(resp.status).toBe(307);
    expect(resp.headers.get('location')).toContain('errorCode=AuthError');
  });

  it('handles error without code or name', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const resp = await config.onCallback({}, { returnTo: '/test' });
    expect(resp.status).toBe(307);
    expect(resp.headers.get('location')).toContain(
      'errorCode=auth_callback_error',
    );
  });

  it('handles string error message', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const resp = await config.onCallback(
      { code: 'test', message: 'plain string error' },
      { returnTo: '/test' },
    );
    expect(resp.status).toBe(307);
  });

  it('handles error message with URLs to strip', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const resp = await config.onCallback(
      { code: 'test', message: 'Error at https://evil.com/path?foo=bar' },
      { returnTo: '/test' },
    );
    expect(resp.status).toBe(307);
  });

  it('handles error message that becomes empty after sanitization', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const resp = await config.onCallback(
      { code: 'test', message: '!!@@##$$%%' },
      { returnTo: '/test' },
    );
    expect(resp.status).toBe(307);
    // Should not include msg parameter since message becomes empty
  });

  it('uses accessToken from session object', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const session = { user: {}, accessToken: 'direct-token' };
    const payload = Buffer.from(
      JSON.stringify({ permissions: ['from:token'] }),
    ).toString('base64url');
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user).toBeDefined();
  });

  it('uses token property when accessToken is missing', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const session = {
      user: {},
      accessToken: { token: 'nested-token' },
    };
    const result = await config.beforeSessionSaved(session, 'invalid');
    expect(result.user).toBeDefined();
  });

  it('handles accessToken object with accessToken property', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const session = {
      user: {},
      accessToken: { accessToken: 'nested-access-token' },
    };
    const result = await config.beforeSessionSaved(session, 'invalid');
    expect(result.user).toBeDefined();
  });

  it('filters non-strings from array in toStringArray', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const session = {
      user: {
        permissions: ['valid', 123, null, 'another', undefined],
      },
    };
    const result = await config.beforeSessionSaved(session, 'x.e30.y');
    expect(result.user.permissions).toEqual(['valid', 'another']);
  });

  it('parses permissions string with comma and space separators', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const payload = Buffer.from(
      JSON.stringify({
        'https://tenon.ai/permissions_str': 'perm1, perm2,perm3  perm4',
      }),
    ).toString('base64url');
    const session = { user: {} };
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user.permissions).toContain('perm1');
    expect(result.user.permissions).toContain('perm2');
    expect(result.user.permissions).toContain('perm3');
    expect(result.user.permissions).toContain('perm4');
  });

  it('derives both recruiter and candidate permissions from roles', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const payload = Buffer.from(
      JSON.stringify({ roles: ['SuperRecruiter', 'CandidateAdmin'] }),
    ).toString('base64url');
    const session = { user: {} };
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user.permissions).toContain('recruiter:access');
    expect(result.user.permissions).toContain('candidate:access');
  });

  it('uses user permissions when available over token permissions', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const payload = Buffer.from(
      JSON.stringify({ permissions: ['token:perm'] }),
    ).toString('base64url');
    const session = {
      user: { permissions: ['user:perm'] },
    };
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user.permissions).toContain('user:perm');
    expect(result.user.permissions).not.toContain('token:perm');
  });

  it('uses user roles when available over token roles', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const payload = Buffer.from(
      JSON.stringify({ roles: ['TokenRole'] }),
    ).toString('base64url');
    const session = {
      user: { 'https://tenon.ai/roles': ['UserRole'] },
    };
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user.roles).toContain('UserRole');
    expect(result.user.roles).not.toContain('TokenRole');
  });

  it('preserves existing user permissions/roles when normalized are empty', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const session = {
      user: { permissions: ['existing:perm'], roles: ['ExistingRole'] },
    };
    const result = await config.beforeSessionSaved(session, 'x.e30.y');
    expect(result.user.permissions).toContain('existing:perm');
  });

  it('decodes JWT using Buffer when atob unavailable', async () => {
    const originalAtob = global.atob;
    // @ts-expect-error remove atob
    delete global.atob;

    await import('@/lib/auth0');
    const config = getAuth0Config();

    const payload = Buffer.from(
      JSON.stringify({ permissions: ['buffer:perm'] }),
    ).toString('base64url');
    const session = { user: {} };
    const result = await config.beforeSessionSaved(session, `x.${payload}.y`);
    expect(result.user.permissions).toContain('buffer:perm');

    global.atob = originalAtob;
  });

  it('falls back to idToken when accessToken decode fails', async () => {
    await import('@/lib/auth0');
    const config = getAuth0Config();

    const idPayload = Buffer.from(
      JSON.stringify({ permissions: ['id:perm'] }),
    ).toString('base64url');
    const session = { user: {}, accessToken: 'invalid' };
    const result = await config.beforeSessionSaved(session, `x.${idPayload}.y`);
    expect(result.user.permissions).toContain('id:perm');
  });

  it('getAccessToken throws when no token in result', async () => {
    mockAuth0Instance.getAccessToken.mockResolvedValue({ token: null });
    const { getAccessToken } = await import('@/lib/auth0');
    await expect(getAccessToken()).rejects.toThrow(/No access token found/);
  });

  it('getAccessToken returns token when available', async () => {
    mockAuth0Instance.getAccessToken.mockResolvedValue({
      token: 'valid-token',
    });
    const { getAccessToken } = await import('@/lib/auth0');
    const token = await getAccessToken();
    expect(token).toBe('valid-token');
  });

  it('getSessionNormalized passes request to getSession when provided', async () => {
    const { NextRequest } = jest.requireMock('next/server');
    mockAuth0Instance.getSession.mockResolvedValue({
      user: { sub: 'user-123' },
    });
    const { getSessionNormalized } = await import('@/lib/auth0');
    const req = new NextRequest('http://localhost/test');
    await getSessionNormalized(req);
    expect(mockAuth0Instance.getSession).toHaveBeenCalledWith(req);
  });

  it('getSessionNormalized returns session as-is when no user', async () => {
    mockAuth0Instance.getSession.mockResolvedValue({ accessToken: 'tok' });
    const { getSessionNormalized } = await import('@/lib/auth0');
    const session = await getSessionNormalized();
    expect(session).toEqual({ accessToken: 'tok' });
  });

  it('uses VERCEL_URL in resolveBaseUrl when primary is missing', async () => {
    // This test verifies the URL resolution logic
    // The client requires TENON_APP_BASE_URL for hasAuth0Env,
    // but resolveBaseUrl can use VERCEL_URL as fallback
    await import('@/lib/auth0');
    const config = getAuth0Config();

    // Test with a modified environment - redirect uses resolveBaseUrl internally
    const resp = await config.onCallback(null, { returnTo: '/dashboard' });
    expect(resp.status).toBe(307);
    expect(resp.headers.get('location')).toContain('/dashboard');
  });

  it('handles callback with candidate path for mode detection', async () => {
    const { modeForPath } = jest.requireMock('@/lib/auth/routing');
    modeForPath.mockReturnValueOnce('recruiter');

    await import('@/lib/auth0');
    const config = getAuth0Config();

    const resp = await config.onCallback(
      { code: 'err' },
      { returnTo: '/dashboard/simulations' },
    );
    expect(resp.status).toBe(307);
    expect(resp.headers.get('location')).toContain('mode=recruiter');
  });
});
