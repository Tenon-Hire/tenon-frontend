jest.mock('next/server', () => {
  const buildHeaders = (init?: Record<string, string>) => {
    const store = new Map<string, string>();
    Object.entries(init ?? {}).forEach(([k, v]) =>
      store.set(k.toLowerCase(), v),
    );
    return {
      get: (key: string) => store.get(key.toLowerCase()) ?? null,
      set: (key: string, value: string) => store.set(key.toLowerCase(), value),
      delete: (key: string) => store.delete(key.toLowerCase()),
    };
  };

  const buildResponse = (
    status = 200,
    body?: unknown,
    headers?: Record<string, string>,
  ) => {
    const cookies = new Map<string, { name: string; value: string }>();
    return {
      status,
      body,
      headers: buildHeaders(headers),
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

  class FakeNextRequest {
    url: string;
    nextUrl: URL;
    headers: { get: (key: string) => string | null };
    signal: AbortSignal;
    constructor(url: URL | string, headers?: Record<string, string>) {
      this.url = url.toString();
      this.nextUrl = new URL(this.url);
      const headerStore = new Map<string, string>();
      Object.entries(headers ?? {}).forEach(([k, v]) =>
        headerStore.set(k.toLowerCase(), v),
      );
      this.headers = {
        get: (key: string) => headerStore.get(key.toLowerCase()) ?? null,
      };
      this.signal = new AbortController().signal;
    }
  }

  return {
    NextResponse: {
      json: (
        body: unknown,
        init?: { status?: number; headers?: Record<string, string> },
      ) =>
        buildResponse(
          init?.status ?? 200,
          body,
          (init?.headers as Record<string, string>) ?? undefined,
        ),
      next: () => buildResponse(200),
    },
    NextRequest: FakeNextRequest,
  };
});

import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/dashboard/route';

jest.mock('@/lib/server/bffAuth', () => {
  const mergeResponseCookies = (
    from: {
      cookies?: { getAll?: () => Array<{ name: string; value: string }> };
    },
    into: {
      cookies?: { set?: (cookie: { name: string; value: string }) => void };
    },
  ) => {
    if (!from?.cookies?.getAll || !into?.cookies?.set) return;
    from.cookies
      .getAll()
      .forEach((cookie: { name: string; value: string }) =>
        into.cookies?.set?.(cookie),
      );
  };
  return {
    requireBffAuth: jest.fn(),
    mergeResponseCookies,
  };
});

jest.mock('@/lib/server/bff', () => ({
  upstreamRequest: jest.fn(),
  parseUpstreamBody: jest.fn(async (res: Response) => {
    if (typeof (res as { json?: unknown }).json === 'function') {
      return (res as { json: () => unknown }).json();
    }
    return undefined;
  }),
  getBackendBaseUrl: jest.fn(() => 'https://backend.test'),
  REQUEST_ID_HEADER: 'x-tenon-request-id',
  UPSTREAM_HEADER: 'x-tenon-upstream-status',
  resolveRequestId: jest.fn(() => 'req-123'),
}));

const requireBffAuthMock = jest.requireMock('@/lib/server/bffAuth')
  .requireBffAuth as jest.Mock;
const upstreamRequestMock = jest.requireMock('@/lib/server/bff')
  .upstreamRequest as jest.Mock;
const parseUpstreamBodyMock = jest.requireMock('@/lib/server/bff')
  .parseUpstreamBody as jest.Mock;
const getBackendBaseUrlMock = jest.requireMock('@/lib/server/bff')
  .getBackendBaseUrl as jest.Mock;

const { BFF_HEADER } = jest.requireActual('@/app/api/utils');

function makeUpstreamResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (key: string) =>
        key.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => body,
  } as unknown as Response;
}

describe('/api/dashboard route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBackendBaseUrlMock.mockReturnValue('https://backend.test');
  });

  it('returns auth failure when guard fails', async () => {
    const cookies = NextResponse.next();
    requireBffAuthMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 },
      ),
      cookies,
    });

    const req = new NextRequest('http://localhost/api/dashboard');
    const res = await GET(req as never);

    expect(res.status).toBe(401);
    expect(res.headers.get('x-tenon-request-id')).toBe('req-123');
  });

  it('returns combined payload and sets headers', async () => {
    const cookies = NextResponse.next();
    cookies.cookies.set('edge', 'refresh');
    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'token-abc',
      permissions: ['recruiter:access'],
      session: {},
      cookies,
    });

    upstreamRequestMock
      .mockResolvedValueOnce(makeUpstreamResponse({ name: 'Recruiter' }, 200))
      .mockResolvedValueOnce(
        makeUpstreamResponse(
          [{ id: '1', title: 'Sim', role: 'Eng', createdAt: '2024-01-01' }],
          200,
        ),
      );

    parseUpstreamBodyMock.mockImplementation(async (res: Response) =>
      (res as { json: () => unknown }).json(),
    );

    const req = new NextRequest('http://localhost/api/dashboard', {
      headers: { 'x-tenon-request-id': 'incoming-id' },
    });
    const res = await GET(req as never);

    expect(upstreamRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.test/api/auth/me',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-abc',
        }),
        requestId: 'req-123',
      }),
    );
    expect(upstreamRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.test/api/simulations',
        requestId: 'req-123',
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      profile: { name: 'Recruiter' },
      simulations: [
        { id: '1', title: 'Sim', role: 'Eng', createdAt: '2024-01-01' },
      ],
      profileError: null,
      simulationsError: null,
    });
    expect(res.headers.get(BFF_HEADER)).toBe('dashboard');
    expect(res.headers.get('x-tenon-request-id')).toBe('req-123');
    expect(res.headers.get('x-tenon-upstream-status')).toBe('200');
    expect(res.headers.get('x-tenon-upstream-status-profile')).toBe('200');
    expect(res.headers.get('x-tenon-upstream-status-simulations')).toBe('200');
    expect(res.headers.get('Server-Timing')).toMatch(/bff;dur=/);
    expect(res.headers.get('Server-Timing')).toMatch(/count=/);
    expect(res.cookies.get('edge')?.value).toBe('refresh');
  });

  it('threads request signal to upstream calls', async () => {
    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'token',
      permissions: ['recruiter:access'],
      session: {},
      cookies: NextResponse.next(),
    });

    upstreamRequestMock.mockResolvedValue(makeUpstreamResponse({}, 200));
    const req = new NextRequest('http://localhost/api/dashboard');

    await GET(req as never);

    expect(upstreamRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: req.signal,
      }),
    );
  });

  it('propagates auth/me 401', async () => {
    const cookies = NextResponse.next();
    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'token',
      permissions: ['recruiter:access'],
      session: {},
      cookies,
    });

    upstreamRequestMock
      .mockResolvedValueOnce(
        makeUpstreamResponse({ message: 'Not authenticated' }, 401),
      )
      .mockResolvedValueOnce(makeUpstreamResponse([], 200));

    const res = await GET(
      new NextRequest('http://localhost/api/dashboard') as never,
    );

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Not authenticated' });
    expect(res.headers.get('x-tenon-request-id')).toBe('req-123');
  });

  it('keeps profile on simulations failure', async () => {
    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'token',
      permissions: ['recruiter:access'],
      session: {},
      cookies: NextResponse.next(),
    });

    upstreamRequestMock
      .mockResolvedValueOnce(makeUpstreamResponse({ name: 'Recruiter' }, 200))
      .mockResolvedValueOnce(
        makeUpstreamResponse({ message: 'Backend down' }, 502),
      );

    const res = await GET(
      new NextRequest('http://localhost/api/dashboard') as never,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      profile: { name: 'Recruiter' },
      simulations: [],
      profileError: null,
      simulationsError: 'Backend down',
    });
    expect(res.headers.get('x-tenon-request-id')).toBe('req-123');
    expect(res.headers.get('x-tenon-upstream-status')).toBe('502');
  });

  it('returns partial payload when profile request rejects', async () => {
    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'token',
      permissions: ['recruiter:access'],
      session: {},
      cookies: NextResponse.next(),
    });

    upstreamRequestMock.mockRejectedValueOnce(new Error('profile boom'));
    upstreamRequestMock.mockResolvedValueOnce(
      makeUpstreamResponse(
        [{ id: '1', title: 'Sim', role: 'Eng', createdAt: '2024-01-01' }],
        200,
      ),
    );

    const res = await GET(
      new NextRequest('http://localhost/api/dashboard') as never,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      profile: null,
      simulations: [
        { id: '1', title: 'Sim', role: 'Eng', createdAt: '2024-01-01' },
      ],
      profileError: 'Unable to load your profile right now.',
      simulationsError: null,
    });
    expect(res.headers.get('x-tenon-upstream-status')).toBe('502');
  });
});
