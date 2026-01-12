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

  const buildResponse = (location?: string) => {
    const headers = buildHeaders();
    if (location) headers.set('location', location);
    const deleted: Array<{ name: string; options?: unknown }> = [];
    return {
      status: 307,
      headers,
      cookies: {
        delete: (value: string | { name: string }) => {
          const name = typeof value === 'string' ? value : value.name;
          deleted.push({ name });
        },
      },
      __deleted: deleted,
    };
  };

  class FakeNextRequest {
    url: string;
    nextUrl: URL;
    cookies: { getAll: () => Array<{ name: string; value?: string }> };
    constructor(
      url: string,
      init?: { cookies?: Array<{ name: string; value?: string }> },
    ) {
      this.url = url;
      this.nextUrl = new URL(url);
      const cookieList = init?.cookies ?? [];
      this.cookies = {
        getAll: () => cookieList,
      };
    }
  }

  return {
    NextRequest: FakeNextRequest,
    NextResponse: {
      redirect: (url: string) => buildResponse(url),
    },
  };
});

import { NextRequest } from 'next/server';
import { GET } from '@/app/(auth)/auth/clear/route';

describe('/auth/clear route', () => {
  it('clears auth cookies with secure/host prefixes and redirects', async () => {
    const ReqCtor = NextRequest as unknown as new (
      url: string,
      init?: { cookies?: Array<{ name: string; value?: string }> },
    ) => NextRequest;
    const req = new ReqCtor(
      'http://app.test/auth/clear?returnTo=%2Fdashboard&mode=recruiter',
      {
        cookies: [
          { name: '__Secure-a0:state', value: '1' },
          { name: '__Host-appSession', value: '2' },
          { name: '__Secure-analytics', value: '3' },
        ],
      },
    );
    const res = await GET(req);
    const location = String(res.headers.get('location') ?? '');
    expect(location).toMatch(/^http:\/\/app\.test\/auth\/error\?/);
    expect(location).toContain('returnTo=%2Fdashboard');
    expect(location).toContain('mode=recruiter');
    expect(location).toContain('cleared=1');
    const deleted = (res as { __deleted?: Array<{ name: string }> }).__deleted;
    const deletedNames = (deleted ?? []).map((entry) => entry.name);
    expect(deletedNames).toContain('__Secure-a0:state');
    expect(deletedNames).toContain('__Host-appSession');
    expect(deletedNames).not.toContain('__Secure-analytics');
  });
});
