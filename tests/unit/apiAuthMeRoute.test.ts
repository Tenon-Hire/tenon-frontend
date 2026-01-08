jest.mock('next/server', () => {
  const buildHeaders = (init?: Record<string, string>) => {
    const store = new Map<string, string>();
    Object.entries(init ?? {}).forEach(([k, v]) =>
      store.set(k.toLowerCase(), v),
    );
    return {
      get: (key: string) => store.get(key.toLowerCase()) ?? null,
      set: (key: string, value: string) => store.set(key.toLowerCase(), value),
    };
  };

  const buildResponse = (status = 200, body?: unknown) => {
    const cookies = new Map<string, { name: string; value: string }>();
    return {
      status,
      body,
      headers: buildHeaders(),
      cookies: {
        set: (
          name: string | { name: string; value: string },
          value?: string,
        ) => {
          if (typeof name === 'object' && name !== null) {
            cookies.set(name.name, { name: name.name, value: name.value });
            return;
          }
          cookies.set(name, { name, value: value ?? '' });
        },
        getAll: () => Array.from(cookies.values()),
        get: (name: string) => cookies.get(name),
      },
    };
  };

  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) =>
        buildResponse(init?.status ?? 200, body),
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

import { NextResponse } from 'next/server';
import { GET } from '@/app/api/auth/me/route';

jest.mock('@/lib/server/bffAuth', () => {
  const mergeResponseCookies = (
    from: {
      cookies?: { getAll?: () => Array<{ name: string; value: string }> };
    },
    into: {
      cookies?: { set?: (cookie: { name: string; value: string }) => void };
    },
  ) => {
    if (
      !from ||
      !from.cookies ||
      typeof from.cookies.getAll !== 'function' ||
      !into?.cookies?.set
    ) {
      return;
    }
    from.cookies.getAll().forEach((cookie: { name: string; value: string }) => {
      into.cookies.set(cookie);
    });
  };
  return {
    requireBffAuth: jest.fn(),
    mergeResponseCookies,
  };
});

jest.mock('@/lib/server/bff', () => ({
  forwardJson: jest.fn(),
}));

const { BFF_HEADER } = jest.requireActual('@/app/api/utils');

const requireBffAuthMock = jest.requireMock('@/lib/server/bffAuth')
  .requireBffAuth as jest.Mock;
const forwardJsonMock = jest.requireMock('@/lib/server/bff')
  .forwardJson as jest.Mock;

describe('/api/auth/me route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns JSON 401 and merges cookies when auth fails', async () => {
    const cookies = NextResponse.next();
    cookies.cookies.set('edge', 'refresh');

    const authResponse = NextResponse.json(
      { message: 'Not authenticated' },
      { status: 401 },
    );
    requireBffAuthMock.mockResolvedValue({
      ok: false,
      response: authResponse,
      cookies,
    });

    const req = new (jest.requireMock('next/server').NextRequest)(
      'http://localhost/api/auth/me',
    );
    const res = await GET(req as never);

    expect(res.status).toBe(401);
    expect(res.cookies.get('edge')?.value).toBe('refresh');
    expect(requireBffAuthMock).toHaveBeenCalledWith(req, {
      requirePermission: 'recruiter:access',
    });
  });

  it('forwards to backend and merges cookies on success', async () => {
    const cookies = NextResponse.next();
    cookies.cookies.set('edge', 'refresh');

    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      permissions: ['recruiter:access'],
      session: {},
      cookies,
    });

    forwardJsonMock.mockResolvedValue(
      NextResponse.json({ id: 1, name: 'Recruiter' }, { status: 200 }),
    );

    const req = new (jest.requireMock('next/server').NextRequest)(
      'http://localhost/api/auth/me',
    );
    const res = await GET(req as never);

    expect(forwardJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/auth/me',
        accessToken: 'tok',
      }),
    );
    expect(res.status).toBe(200);
    expect(res.cookies.get('edge')?.value).toBe('refresh');
    expect(requireBffAuthMock).toHaveBeenCalledWith(req, {
      requirePermission: 'recruiter:access',
    });
    expect(res.headers.get(BFF_HEADER)).toBe('auth-me');
  });
});
