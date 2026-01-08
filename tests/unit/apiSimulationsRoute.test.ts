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

  return {
    NextResponse: {
      json: (
        body: unknown,
        init?: { status?: number; headers?: Record<string, string> },
      ) =>
        buildResponse(init?.status ?? 200, body, {
          'content-type': 'application/json',
          ...(init?.headers ?? {}),
        }),
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
          headerStore.set(k.toLowerCase(), v),
        );
        this.headers = {
          get: (key: string) => headerStore.get(key.toLowerCase()) ?? null,
        };
      }
      async json() {
        return {};
      }
    },
  };
});

import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/simulations/route';

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
  forwardJson: jest.fn(),
  resolveRequestId: jest.fn(() => 'req-123'),
  REQUEST_ID_HEADER: 'x-tenon-request-id',
}));

const requireBffAuthMock = jest.requireMock('@/lib/server/bffAuth')
  .requireBffAuth as jest.Mock;
const forwardJsonMock = jest.requireMock('@/lib/server/bff')
  .forwardJson as jest.Mock;

const { BFF_HEADER } = jest.requireActual('@/app/api/utils');

describe('/api/simulations route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges cookies and returns upstream status for POST', async () => {
    const cookies = NextResponse.next();
    cookies.cookies.set('edge', 'merged');

    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      permissions: ['recruiter:access'],
      session: {},
      cookies,
    });

    forwardJsonMock.mockResolvedValue(
      NextResponse.json({ id: 'sim_123' }, { status: 201 }),
    );

    const req = new NextRequest(new URL('http://localhost/api/simulations'));
    const res = await POST(req as never);

    expect(res.status).toBe(201);
    expect(res.cookies.get('edge')?.value).toBe('merged');
    expect(res.headers.get(BFF_HEADER)).toBe('simulations-create');
    expect(requireBffAuthMock).toHaveBeenCalledWith(req, {
      requirePermission: 'recruiter:access',
    });
  });
});
