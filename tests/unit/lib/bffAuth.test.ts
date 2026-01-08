jest.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: jest.fn(),
    getAccessToken: jest.fn(),
    middleware: jest.fn(),
  },
  getSessionNormalized: jest.fn(),
}));

jest.mock('@/lib/auth0-claims', () => ({
  extractPermissions: jest.fn(() => ['perm:read']),
  hasPermission: jest.fn((perms: string[], needed?: string) =>
    needed ? perms.includes(needed) : true,
  ),
}));

const { getSessionNormalized, auth0 } = jest.requireMock('@/lib/auth0');
const { extractPermissions, hasPermission } =
  jest.requireMock('@/lib/auth0-claims');

jest.mock('next/server', () => {
  class FakeCookies {
    private store = new Map<string, { name: string; value: string }>();

    set(input: string | { name: string; value: string }, value?: string) {
      if (typeof input === 'object') {
        this.store.set(input.name, input);
        return;
      }
      this.store.set(input, { name: input, value: value ?? '' });
    }

    getAll() {
      return Array.from(this.store.values());
    }
  }

  class FakeNextResponse {
    status: number;
    body: unknown;
    cookies: FakeCookies;
    headers: Map<string, string>;

    constructor(
      body?: unknown,
      init?: { status?: number; headers?: Record<string, string> },
    ) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.cookies = new FakeCookies();
      this.headers = new Map<string, string>();
      Object.entries(init?.headers ?? {}).forEach(([k, v]) =>
        this.headers.set(k.toLowerCase(), v),
      );
    }

    static json(body: unknown, init?: { status?: number }) {
      return new FakeNextResponse(body, {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    static next() {
      return new FakeNextResponse();
    }
  }

  return {
    NextResponse: FakeNextResponse,
    NextRequest: class FakeNextRequest {},
  };
});

import { NextResponse } from 'next/server';
import { mergeResponseCookies, requireBffAuth } from '@/lib/server/bffAuth';

describe('mergeResponseCookies', () => {
  it('copies cookies from one response into another', () => {
    const source = NextResponse.json({ ok: true });
    source.cookies.set({ name: 'a', value: '1' });
    source.cookies.set({ name: 'b', value: '2' });
    const target = NextResponse.json({ ok: true });

    mergeResponseCookies(source, target);

    expect(target.cookies.getAll()).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ]);
  });
});

describe('requireBffAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    getSessionNormalized.mockResolvedValue(null);

    const result = await requireBffAuth({} as never);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns 403 when permission missing', async () => {
    getSessionNormalized.mockResolvedValue({ user: { sub: 'u1' } });
    (extractPermissions as jest.Mock).mockReturnValue(['other']);
    (hasPermission as jest.Mock).mockReturnValue(false);

    const result = await requireBffAuth({} as never, {
      requirePermission: 'recruiter:access',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('returns 401 when access token cannot be obtained', async () => {
    getSessionNormalized.mockResolvedValue({
      user: { sub: 'u1' },
      accessToken: 'stale',
    });
    (auth0.getAccessToken as jest.Mock).mockResolvedValue(undefined);

    const result = await requireBffAuth({} as never);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns success payload with access token and permissions', async () => {
    getSessionNormalized.mockResolvedValue({
      user: { sub: 'u1' },
      accessToken: 'base',
    });
    (extractPermissions as jest.Mock).mockReturnValue(['recruiter:access']);
    (hasPermission as jest.Mock).mockReturnValue(true);
    (auth0.getAccessToken as jest.Mock).mockResolvedValue({
      accessToken: 'fresh-token',
    });

    const result = await requireBffAuth({} as never, {
      requirePermission: 'recruiter:access',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accessToken).toBe('fresh-token');
      expect(result.permissions).toEqual(['recruiter:access']);
      expect(result.cookies).toBeInstanceOf(NextResponse);
    }
  });
});
