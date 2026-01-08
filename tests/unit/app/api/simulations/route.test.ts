jest.mock('next/server', () => {
  const buildHeaders = () => {
    const store = new Map<string, string>();
    return {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => store.set(key, value),
    };
  };
  const buildResponse = (status = 200) => ({
    status,
    headers: buildHeaders(),
    cookies: {
      set: () => undefined,
      getAll: () => [],
    },
  });

  return {
    NextResponse: {
      json: (_body: unknown, init?: { status?: number }) =>
        buildResponse(init?.status ?? 200),
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
import * as bffAuth from '@/lib/server/bffAuth';
import * as bff from '@/lib/server/bff';
import { GET, POST } from '@/app/api/simulations/route';

jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: jest.fn(),
  mergeResponseCookies: jest.fn(),
}));
jest.mock('@/lib/server/bff', () => ({
  forwardJson: jest.fn(),
  UPSTREAM_HEADER: 'x-tenon-upstream-status',
  resolveRequestId: jest.fn(() => 'req-123'),
  REQUEST_ID_HEADER: 'x-tenon-request-id',
}));

const requireBffAuth = bffAuth.requireBffAuth as jest.MockedFunction<
  typeof bffAuth.requireBffAuth
>;
const mergeResponseCookies =
  bffAuth.mergeResponseCookies as jest.MockedFunction<
    typeof bffAuth.mergeResponseCookies
  >;
const forwardJson = bff.forwardJson as jest.MockedFunction<
  typeof bff.forwardJson
>;

describe('api/simulations route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 401 json when auth fails on POST', async () => {
    requireBffAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 },
      ),
      cookies: NextResponse.next(),
    });

    const res = await POST(
      new NextRequest(new URL('http://localhost/api/simulations')),
    );

    expect(res.status).toBe(401);
    expect(requireBffAuth).toHaveBeenCalledWith(expect.any(NextRequest), {
      requirePermission: 'recruiter:access',
    });
    expect(mergeResponseCookies).toHaveBeenCalled();
  });

  it('forwards upstream response and tags header on success', async () => {
    requireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'token',
      permissions: ['recruiter:access'],
      session: {} as never,
      cookies: NextResponse.next(),
    });

    forwardJson.mockResolvedValue(
      NextResponse.json({ id: 'abc123' }, { status: 201 }),
    );

    const res = await POST(
      new NextRequest(new URL('http://localhost/api/simulations')),
    );

    expect(res.status).toBe(201);
    expect(res.headers.get('x-tenon-bff')).toBe('simulations-create');
    expect(forwardJson).toHaveBeenCalled();
  });

  it('enforces auth on GET', async () => {
    requireBffAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ message: 'Forbidden' }, { status: 403 }),
      cookies: NextResponse.next(),
    });

    const res = await GET(
      new NextRequest(new URL('http://localhost/api/simulations')),
    );

    expect(res.status).toBe(403);
    expect(requireBffAuth).toHaveBeenCalledWith(expect.any(NextRequest), {
      requirePermission: 'recruiter:access',
    });
  });
});
