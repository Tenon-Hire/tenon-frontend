jest.mock('next/server', () => {
  const buildResponse = (status = 200, location?: string) => {
    const headerStore = new Map<string, string>();
    if (location) headerStore.set('location', location);
    const cookieStore = new Map<string, { name: string; value: string }>();

    return {
      status,
      headers: {
        get: (key: string) => headerStore.get(key) ?? null,
        set: (key: string, value: string) => headerStore.set(key, value),
      },
      cookies: {
        set: (
          name: string | { name: string; value: string },
          value?: string,
        ) => {
          if (typeof name === 'object' && name !== null) {
            cookieStore.set(name.name, { name: name.name, value: name.value });
            return;
          }
          cookieStore.set(name, { name, value: value ?? '' });
        },
        getAll: () => Array.from(cookieStore.values()),
      },
    };
  };

  return {
    NextResponse: {
      redirect: (url: URL | string) => buildResponse(307, url.toString()),
      next: () => buildResponse(200),
      json: (_body: unknown, init?: { status?: number }) =>
        buildResponse(init?.status ?? 200),
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

jest.mock('@/lib/auth0', () => ({
  auth0: {
    middleware: jest.fn(() => ({})),
    getSession: jest.fn(),
    getAccessToken: jest.fn(),
  },
  getSessionNormalized: jest.fn(),
}));

jest.mock('@/lib/auth0-claims', () => ({
  extractPermissions: jest.fn(() => []),
  hasPermission: jest.fn(() => false),
}));

jest.mock('@/lib/auth/proxyUtils', () => ({
  isNextResponse: jest.fn(() => false),
  normalizeAccessToken: jest.fn(),
  redirectToLogin: jest.fn(() => ({
    status: 307,
    headers: { get: () => null, set: () => {} },
    cookies: { getAll: () => [], set: () => {} },
  })),
  shouldSkipAuth: jest.fn(() => false),
  modeForPath: jest.fn(() => 'candidate'),
}));

jest.mock('@/proxy/redirects', () => ({
  normalizeLogoutRedirect: jest.fn(() => null),
}));

jest.mock('@/proxy/perf', () => ({
  startPerfTimer: jest.fn(() => null),
  buildResponder: jest.fn(() => (resp: unknown) => resp),
}));

jest.mock('@/proxy/auth', () => ({
  redirectSignedInHome: jest.fn(() => null),
  gateByRole: jest.fn(() => null),
}));

import middleware, { config as middlewareConfig } from '../../middleware';
import { proxy, config as proxyConfig } from '@/proxy';

describe('middleware wiring', () => {
  it('re-exports proxy handler', () => {
    expect(middleware).toBe(proxy);
  });

  it('mirrors proxy config matcher', () => {
    expect(middlewareConfig).toEqual(proxyConfig);
  });

  it('matcher skips static/image and includes app paths', () => {
    const pattern = middlewareConfig.matcher?.[0];
    expect(typeof pattern).toBe('string');
    const raw = pattern as string;
    const patternStr = raw.startsWith('/') ? raw.slice(1) : raw;
    const anchored = new RegExp(`^${patternStr}$`);
    expect(anchored.test('dashboard')).toBe(true);
    expect(anchored.test('candidate/session/tok')).toBe(true);
    expect(anchored.test('_next/static/chunk.js')).toBe(false);
    expect(anchored.test('_next/image')).toBe(false);
    expect(anchored.test('favicon.ico')).toBe(false);
  });
});
