jest.mock('next/server', () => {
  type CookieValue = { name: string; value?: string } | string;
  class MockNextResponse {
    status: number;
    body?: unknown;
    cookies = {
      store: new Map<string, CookieValue>(),
      set: (cookie: CookieValue) => {
        const key = typeof cookie === 'string' ? cookie : cookie.name;
        this.cookies.store.set(key, cookie);
      },
      get: (name: string) => this.cookies.store.get(name),
      getAll: () => Array.from(this.cookies.store.values()),
    };
    headers = new Map<string, string>();
    constructor(body?: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    static next() {
      return new MockNextResponse(undefined, { status: 200 });
    }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  class MockNextRequest {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

import { NextRequest, NextResponse } from 'next/server';
import { requireBffAuth, mergeResponseCookies } from '@/lib/server/bffAuth';

const getSessionNormalizedMock = jest.fn();
let auth0Mock: { getAccessToken: jest.Mock };

jest.mock('@/lib/auth0', () => {
  auth0Mock = { getAccessToken: jest.fn() };
  return {
    auth0: auth0Mock,
    getSessionNormalized: (...args: unknown[]) =>
      getSessionNormalizedMock(...args),
  };
});

jest.mock('@/lib/auth0-claims', () => {
  const actual = jest.requireActual('@/lib/auth0-claims');
  return {
    ...actual,
    extractPermissions: jest.fn(() => ['candidate:access']),
    hasPermission: jest.fn((perms: string[], req: string) =>
      perms.includes(req),
    ),
  };
});

describe('bffAuth utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TENON_DEBUG_PERF;
  });

  it('merges response cookies', () => {
    const from = NextResponse.next();
    from.cookies.set('a', '1');
    const into = NextResponse.next();
    mergeResponseCookies(from, into);
    expect(into.cookies.get('a')).toBeDefined();
  });

  it('returns 401 when session missing', async () => {
    getSessionNormalizedMock.mockResolvedValue(null);
    const res = await requireBffAuth(new NextRequest('http://x'));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.response.status).toBe(401);
    }
  });

  it('returns 403 when permission missing', async () => {
    getSessionNormalizedMock.mockResolvedValue({ user: { email: 'a' } });
    const res = await requireBffAuth(new NextRequest('http://x'), {
      requirePermission: 'recruiter:access',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(403);
  });

  it('returns 401 when access token cannot be obtained', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { email: 'a' },
      accessToken: null,
    });
    auth0Mock.getAccessToken.mockResolvedValue(null);
    const res = await requireBffAuth(new NextRequest('http://x'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });

  it('returns success when token present and logs perf when enabled', async () => {
    process.env.TENON_DEBUG_PERF = 'true';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    getSessionNormalizedMock.mockResolvedValue({
      user: { email: 'a' },
      accessToken: { token: 'tok' },
    });
    auth0Mock.getAccessToken.mockResolvedValue({ token: 'tok' });
    const res = await requireBffAuth(new NextRequest('http://x'));
    expect(res.ok).toBe(true);
    consoleSpy.mockRestore();
  });

  it('handles auth0.getAccessToken throwing', async () => {
    getSessionNormalizedMock.mockResolvedValue({
      user: { email: 'a' },
      accessToken: { token: 'tok' },
    });
    auth0Mock.getAccessToken.mockRejectedValue(new Error('fail'));
    const res = await requireBffAuth(new NextRequest('http://x'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });
});
/* eslint-disable @typescript-eslint/no-explicit-any */
