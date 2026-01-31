/**
 * Tests for access token routes
 */
import { NextRequest, NextResponse } from 'next/server';
import { markMetadataCovered } from './coverageHelpers';

jest.mock('next/server', () => {
  const buildHeaders = () => {
    const store = new Map<string, string>();
    return {
      get: (key: string) => store.get(key.toLowerCase()) ?? null,
      set: (key: string, value: string) => store.set(key.toLowerCase(), value),
    };
  };

  const buildCookies = () => {
    const cookieStore = new Map<string, { name: string; value: string }>();
    return {
      set: (name: string | { name: string; value: string }, value?: string) => {
        if (typeof name === 'object') {
          cookieStore.set(name.name, { name: name.name, value: name.value });
          return;
        }
        cookieStore.set(name, { name, value: value ?? '' });
      },
      getAll: () => Array.from(cookieStore.values()),
      get: (name: string) => cookieStore.get(name),
    };
  };

  const buildResponse = (status = 200, body?: unknown) => ({
    status,
    body,
    headers: buildHeaders(),
    cookies: buildCookies(),
    json: async () => body,
  });

  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) =>
        buildResponse(init?.status ?? 200, body),
      next: () => buildResponse(200),
    },
    NextRequest: class {
      url: string;
      nextUrl: URL;
      headers: { get: (key: string) => string | null };
      constructor(url: URL | string, headers?: Record<string, string>) {
        this.url = url.toString();
        this.nextUrl = new URL(this.url);
        const headerStore = new Map<string, string>();
        Object.entries(headers ?? {}).forEach(([k, v]) =>
          headerStore.set(k.toLowerCase(), String(v)),
        );
        this.headers = {
          get: (key: string) => headerStore.get(key.toLowerCase()) ?? null,
        };
      }
    },
  };
});

const mockRequireBffAuth = jest.fn();
const mockMergeResponseCookies = jest.fn();

jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: (...args: unknown[]) => mockRequireBffAuth(...args),
  mergeResponseCookies: (...args: unknown[]) =>
    mockMergeResponseCookies(...args),
}));

describe('/api/auth/access-token route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('covers metadata exports', async () => {
    const mod = await import('@/app/api/auth/access-token/route');
    markMetadataCovered('@/app/api/auth/access-token/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');
  });

  it('returns 401 when auth fails', async () => {
    const authCookies = NextResponse.next();
    authCookies.cookies.set('session', 'refresh');

    const authResponse = NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 },
    );
    mockRequireBffAuth.mockResolvedValue({
      ok: false,
      response: authResponse,
      cookies: authCookies,
    });

    const mod = await import('@/app/api/auth/access-token/route');
    markMetadataCovered('@/app/api/auth/access-token/route');

    const req = new NextRequest('http://localhost/api/auth/access-token');
    const res = await mod.GET(req as never);

    expect(res.status).toBe(401);
    expect(mockMergeResponseCookies).toHaveBeenCalledWith(
      authCookies,
      authResponse,
    );
  });

  it('returns accessToken on success', async () => {
    const authCookies = NextResponse.next();
    authCookies.cookies.set('session', 'valid');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'test-access-token',
      cookies: authCookies,
    });

    const mod = await import('@/app/api/auth/access-token/route');
    markMetadataCovered('@/app/api/auth/access-token/route');

    const req = new NextRequest('http://localhost/api/auth/access-token');
    const res = await mod.GET(req as never);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accessToken: 'test-access-token' });
    expect(mockMergeResponseCookies).toHaveBeenCalled();
  });
});

describe('/api/dev/access-token route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('covers metadata exports', async () => {
    const mod = await import('@/app/api/dev/access-token/route');
    markMetadataCovered('@/app/api/dev/access-token/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');
  });

  it('returns 403 when auth fails', async () => {
    const authCookies = NextResponse.next();
    const authResponse = NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 },
    );
    mockRequireBffAuth.mockResolvedValue({
      ok: false,
      response: authResponse,
      cookies: authCookies,
    });

    const mod = await import('@/app/api/dev/access-token/route');
    markMetadataCovered('@/app/api/dev/access-token/route');

    const req = new NextRequest('http://localhost/api/dev/access-token');
    const res = await mod.GET(req as never);

    expect(res.status).toBe(403);
    expect(mockMergeResponseCookies).toHaveBeenCalledWith(
      authCookies,
      authResponse,
    );
  });

  it('returns accessToken on success', async () => {
    const authCookies = NextResponse.next();

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'dev-access-token',
      cookies: authCookies,
    });

    const mod = await import('@/app/api/dev/access-token/route');
    markMetadataCovered('@/app/api/dev/access-token/route');

    const req = new NextRequest('http://localhost/api/dev/access-token');
    const res = await mod.GET(req as never);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accessToken: 'dev-access-token' });
    expect(mockMergeResponseCookies).toHaveBeenCalled();
  });
});
