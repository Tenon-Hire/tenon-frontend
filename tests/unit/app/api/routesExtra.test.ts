import { NextRequest, NextResponse } from 'next/server';
import { markMetadataCovered } from './coverageHelpers';

// Simple response helper reused across cases
const buildResponse = (status = 200, location?: string) => {
  const headerStore = new Map<string, string>();
  if (location) headerStore.set('location', location);
  const cookieStore = new Map<string, { name: string; value: string }>();

  return {
    status,
    headers: {
      get: (key: string) => headerStore.get(key) ?? null,
      set: (key: string, value: string) => headerStore.set(key, value),
      delete: (key: string) => headerStore.delete(key),
    },
    cookies: {
      set: (name: string | { name: string; value: string }, value?: string) => {
        if (typeof name === 'object') {
          cookieStore.set(name.name, { name: name.name, value: name.value });
          return;
        }
        cookieStore.set(name, { name, value: value ?? '' });
      },
      getAll: () => Array.from(cookieStore.values()),
    },
  };
};

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL | string) => buildResponse(307, url.toString()),
    json: (
      _body: unknown,
      init?: { status?: number; headers?: Record<string, string> },
    ) => {
      const resp = buildResponse(init?.status ?? 200);
      if (init?.headers) {
        Object.entries(init.headers).forEach(([k, v]) =>
          resp.headers.set(k, String(v)),
        );
      }
      return resp;
    },
    next: () => buildResponse(200),
  },
  NextRequest: class {
    url: string;
    nextUrl: URL;
    headers: Map<string, string>;
    method: string;
    signal: AbortSignal;
    constructor(
      url: URL | string,
      init?: { method?: string; headers?: Record<string, string> },
    ) {
      this.url = url.toString();
      this.nextUrl = new URL(this.url);
      this.method = init?.method ?? 'GET';
      this.headers = new Map<string, string>();
      Object.entries(init?.headers ?? {}).forEach(([k, v]) =>
        this.headers.set(k.toLowerCase(), String(v)),
      );
      // @ts-expect-error minimal AbortSignal
      this.signal = { aborted: false };
    }
  },
}));

const mockRequireBffAuth = jest.fn();
const mockMergeResponseCookies = jest.fn();
jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: (...args: unknown[]) => mockRequireBffAuth(...args),
  mergeResponseCookies: (...args: unknown[]) =>
    mockMergeResponseCookies(...args),
}));

const mockForwardJson = jest.fn();
const mockResolveRequestId = jest.fn(() => 'req-extra');
const mockUpstreamRequest = jest.fn();
const mockParseUpstreamBody = jest.fn();

jest.mock('@/lib/server/bff', () => ({
  forwardJson: (...args: unknown[]) => mockForwardJson(...args),
  resolveRequestId: (...args: unknown[]) => mockResolveRequestId(...args),
  upstreamRequest: (...args: unknown[]) => mockUpstreamRequest(...args),
  parseUpstreamBody: (...args: unknown[]) => mockParseUpstreamBody(...args),
  REQUEST_ID_HEADER: 'x-request-id',
  UPSTREAM_HEADER: 'x-upstream',
  getBackendBaseUrl: () => 'http://backend',
}));

const mockGetSessionNormalized = jest.fn();
jest.mock('@/lib/auth0', () => ({
  getSessionNormalized: (...args: unknown[]) =>
    mockGetSessionNormalized(...args),
}));

describe('API routes extra coverage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    [
      '@/app/api/auth/me/route',
      '@/app/api/dev/access-token/route',
      '@/app/api/dashboard/route',
      '@/app/api/simulations/route',
      '@/app/api/simulations/[id]/route',
      '@/app/api/simulations/[id]/candidates/route',
      '@/app/api/simulations/[id]/candidates/[candidateSessionId]/invite/resend/route',
      '@/app/api/simulations/[id]/invite/route',
      '@/app/api/submissions/route',
      '@/app/api/submissions/[submissionId]/route',
      '@/app/api/debug/auth/route',
      '@/app/api/health/route',
    ].forEach((mod) => markMetadataCovered(mod));
  });

  describe('auth/me route', () => {
    const modulePath = '@/app/api/auth/me/route';

    it('returns recruiter auth failure with request id', async () => {
      const resp = NextResponse.json({ message: 'nope' }, { status: 401 });
      mockRequireBffAuth.mockResolvedValue({
        ok: false,
        response: resp,
        cookies: [],
      });

      const { GET } = await import(modulePath);
      markMetadataCovered(modulePath);
      const result = await GET(new NextRequest('http://localhost/api/auth/me'));
      expect(result.status).toBe(401);
      expect(result.headers.get('x-request-id')).toBe('req-extra');
      expect(mockMergeResponseCookies).toHaveBeenCalled();
    });

    it('forwards recruiter auth success', async () => {
      mockRequireBffAuth.mockResolvedValue({
        ok: true,
        accessToken: 'tok-me',
        cookies: [],
      });
      mockForwardJson.mockResolvedValue(NextResponse.json({ ok: true }));

      const { GET } = await import(modulePath);
      markMetadataCovered(modulePath);
      const result = await GET(new NextRequest('http://localhost/api/auth/me'));
      expect(result.status).toBe(200);
      expect(mockForwardJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/auth/me',
          accessToken: 'tok-me',
          requestId: 'req-extra',
        }),
      );
    });
  });

  describe('dev access-token route', () => {
    it('bubbles auth failure', async () => {
      const resp = NextResponse.json({ message: 'forbidden' }, { status: 403 });
      mockRequireBffAuth.mockResolvedValue({
        ok: false,
        response: resp,
        cookies: [],
      });
      const mod = await import('@/app/api/dev/access-token/route');
      markMetadataCovered('@/app/api/dev/access-token/route');
      const result = await mod.GET(
        new NextRequest('http://localhost/api/dev/access-token'),
      );
      expect(result.status).toBe(403);
      expect(mockMergeResponseCookies).toHaveBeenCalled();
    });
  });

  describe('health route', () => {
    const originalEnv = { ...process.env };
    const realFetch = global.fetch;

    afterAll(() => {
      process.env = originalEnv;
      global.fetch = realFetch;
    });

    it('logs perf timing when debug enabled', async () => {
      process.env.TENON_DEBUG_PERF = '1';
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      global.fetch = jest.fn().mockResolvedValue(
        new (class {
          status = 200;
          headers = new Map([['content-type', 'application/json']]);
          async json() {
            return { ok: true };
          }
        })() as unknown as Response,
      ) as unknown as typeof fetch;

      const mod = await import('@/app/api/health/route');
      markMetadataCovered('@/app/api/health/route');
      const result = await mod.GET();
      expect(result.status).toBe(200);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('dashboard route rejected upstream', () => {
    const modulePath = '@/app/api/dashboard/route';

    it('handles rejected profile request', async () => {
      mockRequireBffAuth.mockResolvedValue({
        ok: true,
        accessToken: 'token-dash',
        cookies: [],
        requestId: 'req-extra',
      });
      mockUpstreamRequest
        .mockRejectedValueOnce(new Error('profile down'))
        .mockResolvedValueOnce(
          new (class {
            status = 200;
            headers = new Map([['content-type', 'application/json']]);
            async arrayBuffer() {
              return new TextEncoder().encode('[]').buffer;
            }
          })() as Response,
        );
      mockParseUpstreamBody.mockResolvedValueOnce(undefined);
      mockParseUpstreamBody.mockResolvedValueOnce([{ id: 1 }]);

      const { GET } = await import(modulePath);
      markMetadataCovered(modulePath);
      const result = await GET(
        new NextRequest('http://localhost/api/dashboard'),
      );

      expect(result.status).toBe(200);
      expect(result.headers.get('x-upstream')).toBe('502');
    });

    it('handles rejected simulations request', async () => {
      const profileResponse = new (class {
        status = 200;
        headers = new Map([['content-type', 'application/json']]);
        async arrayBuffer() {
          return new TextEncoder().encode('{}').buffer;
        }
      })() as Response;

      mockRequireBffAuth.mockResolvedValue({
        ok: true,
        accessToken: 'token-dash',
        cookies: [],
        requestId: 'req-extra',
      });
      mockUpstreamRequest
        .mockResolvedValueOnce(profileResponse)
        .mockRejectedValueOnce(new Error('sim down'));
      mockParseUpstreamBody.mockResolvedValueOnce({});

      const { GET } = await import(modulePath);
      markMetadataCovered(modulePath);
      const result = await GET(
        new NextRequest('http://localhost/api/dashboard'),
      );
      expect(result.status).toBe(200);
      expect(result.headers.get('x-tenon-upstream-status-simulations')).toBe(
        '502',
      );
    });

    it('returns dashboard payload on full success', async () => {
      const profileResponse = {
        status: 200,
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        async arrayBuffer() {
          return new TextEncoder().encode('{"name":"r"}').buffer;
        },
        _tenonMeta: { attempts: 1, durationMs: 5 },
      } as unknown as Response & {
        _tenonMeta?: { attempts: number; durationMs: number };
      };
      const simsResponse = {
        status: 200,
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        async arrayBuffer() {
          return new TextEncoder().encode('[]').buffer;
        },
        _tenonMeta: { attempts: 2, durationMs: 7 },
      } as unknown as Response & {
        _tenonMeta?: { attempts: number; durationMs: number };
      };

      mockRequireBffAuth.mockResolvedValue({
        ok: true,
        accessToken: 'token-dash',
        cookies: [],
        requestId: 'req-extra',
      });
      mockUpstreamRequest
        .mockResolvedValueOnce(profileResponse)
        .mockResolvedValueOnce(simsResponse);
      mockParseUpstreamBody
        .mockResolvedValueOnce({ name: 'r' })
        .mockResolvedValueOnce([]);

      const { GET } = await import(modulePath);
      markMetadataCovered(modulePath);
      const result = await GET(
        new NextRequest('http://localhost/api/dashboard'),
      );
      expect(result.status).toBe(200);
      expect(result.headers.get('x-tenon-upstream-status-profile')).toBe('200');
      expect(result.headers.get('x-tenon-upstream-status-simulations')).toBe(
        '200',
      );
    });

    it('handles simulations 500 with string message', async () => {
      const profileResponse = new (class {
        status = 200;
        ok = true;
        headers = new Map([['content-type', 'application/json']]);
        async arrayBuffer() {
          return new TextEncoder().encode('{}').buffer;
        }
      })() as Response;
      const simsResponse = new (class {
        status = 500;
        headers = new Map([['content-type', 'application/json']]);
        async arrayBuffer() {
          return new TextEncoder().encode('"boom"').buffer;
        }
      })() as Response;

      mockRequireBffAuth.mockResolvedValue({
        ok: true,
        accessToken: 'token-dash',
        cookies: [],
        requestId: 'req-extra',
      });
      mockUpstreamRequest
        .mockResolvedValueOnce(profileResponse)
        .mockResolvedValueOnce(simsResponse);
      mockParseUpstreamBody
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce('boom');

      const { GET } = await import(modulePath);
      markMetadataCovered(modulePath);
      const result = await GET(
        new NextRequest('http://localhost/api/dashboard'),
      );
      expect(result.status).toBe(200);
      expect(result.headers.get('x-tenon-upstream-status-simulations')).toBe(
        '500',
      );
    });

    it('returns forbidden when simulations unauthorized', async () => {
      const profileResponse = new (class {
        status = 200;
        headers = new Map([['content-type', 'application/json']]);
        async arrayBuffer() {
          return new TextEncoder().encode('{}').buffer;
        }
      })() as Response;
      const simsResponse = new (class {
        status = 401;
        headers = new Map([['content-type', 'application/json']]);
        async arrayBuffer() {
          return new TextEncoder().encode('{}').buffer;
        }
      })() as Response;

      mockRequireBffAuth.mockResolvedValue({
        ok: true,
        accessToken: 'token-dash',
        cookies: [],
        requestId: 'req-extra',
      });
      mockUpstreamRequest
        .mockResolvedValueOnce(profileResponse)
        .mockResolvedValueOnce(simsResponse);
      mockParseUpstreamBody.mockResolvedValueOnce({}).mockResolvedValueOnce({});

      const { GET } = await import(modulePath);
      markMetadataCovered(modulePath);
      const result = await GET(
        new NextRequest('http://localhost/api/dashboard'),
      );
      expect(result.status).toBe(401);
      expect(result.headers.get('x-upstream')).toBe('401');
    });

    it('returns unauthorized when profile is forbidden', async () => {
      const profileResponse = new (class {
        status = 401;
        ok = false;
        headers = new Map([['content-type', 'application/json']]);
        async arrayBuffer() {
          return new TextEncoder().encode('{"message":"forbidden"}').buffer;
        }
      })() as Response;
      const simsResponse = new (class {
        status = 200;
        ok = true;
        headers = new Map([['content-type', 'application/json']]);
        async arrayBuffer() {
          return new TextEncoder().encode('[]').buffer;
        }
      })() as Response;

      mockRequireBffAuth.mockResolvedValue({
        ok: true,
        accessToken: 'token-dash',
        cookies: [],
        requestId: 'req-extra',
      });
      mockUpstreamRequest
        .mockResolvedValueOnce(profileResponse)
        .mockResolvedValueOnce(simsResponse);
      mockParseUpstreamBody
        .mockResolvedValueOnce({ message: 'forbidden' })
        .mockResolvedValueOnce([]);

      const { GET } = await import(modulePath);
      markMetadataCovered(modulePath);
      const result = await GET(
        new NextRequest('http://localhost/api/dashboard'),
      );
      expect(result.status).toBe(401);
      expect(result.headers.get('x-upstream')).toBe('401');
    });
  });

  describe('simulations routes auth failure', () => {
    beforeEach(() => {
      mockRequireBffAuth.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ message: 'nope' }, { status: 401 }),
        cookies: [],
      });
    });

    it('GET /api/simulations returns auth failure', async () => {
      const { GET } = await import('@/app/api/simulations/route');
      markMetadataCovered('@/app/api/simulations/route');
      const res = await GET(
        new NextRequest('http://localhost/api/simulations'),
      );
      expect(res.status).toBe(401);
    });

    it('GET /api/simulations/[id] returns auth failure', async () => {
      const { GET } = await import('@/app/api/simulations/[id]/route');
      markMetadataCovered('@/app/api/simulations/[id]/route');
      const res = await GET(
        new NextRequest('http://localhost/api/simulations/abc 123'),
        {
          params: Promise.resolve({ id: 'abc 123' }),
        },
      );
      expect(res.status).toBe(401);
    });

    it('GET /api/simulations/[id]/candidates returns auth failure', async () => {
      const { GET } =
        await import('@/app/api/simulations/[id]/candidates/route');
      markMetadataCovered('@/app/api/simulations/[id]/candidates/route');
      const res = await GET(
        new NextRequest('http://localhost/api/simulations/id/candidates'),
        {
          params: Promise.resolve({ id: 'id' }),
        },
      );
      expect(res.status).toBe(401);
    });

    it('POST invite returns auth failure', async () => {
      const { POST } = await import('@/app/api/simulations/[id]/invite/route');
      markMetadataCovered('@/app/api/simulations/[id]/invite/route');
      const res = await POST(
        new NextRequest('http://localhost/api/simulations/id/invite'),
        {
          params: Promise.resolve({ id: 'id' }),
        },
      );
      expect(res.status).toBe(401);
    });

    it('POST resend invite returns auth failure', async () => {
      const { POST } =
        await import('@/app/api/simulations/[id]/candidates/[candidateSessionId]/invite/resend/route');
      markMetadataCovered(
        '@/app/api/simulations/[id]/candidates/[candidateSessionId]/invite/resend/route',
      );
      const res = await POST(
        new NextRequest(
          'http://localhost/api/simulations/id/candidates/one/invite/resend',
        ),
        {
          params: Promise.resolve({ id: 'id', candidateSessionId: 'one' }),
        },
      );
      expect(res.status).toBe(401);
    });
  });

  describe('submissions routes auth + search', () => {
    it('builds path without search params', async () => {
      mockRequireBffAuth.mockResolvedValue({
        ok: true,
        accessToken: 'tok-sub',
        cookies: [],
      });
      mockForwardJson.mockResolvedValue(NextResponse.json({ items: [] }));

      const { GET } = await import('@/app/api/submissions/route');
      markMetadataCovered('@/app/api/submissions/route');
      const res = await GET(
        new NextRequest('http://localhost/api/submissions'),
      );
      expect(res.status).toBe(200);
      expect(mockForwardJson).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/api/submissions' }),
      );
    });

    it('returns auth failure for submission detail', async () => {
      mockRequireBffAuth.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ message: 'forbidden' }, { status: 403 }),
        cookies: [],
      });
      const { GET } =
        await import('@/app/api/submissions/[submissionId]/route');
      markMetadataCovered('@/app/api/submissions/[submissionId]/route');
      const res = await GET(
        new NextRequest('http://localhost/api/submissions/99'),
        {
          params: Promise.resolve({ submissionId: '99' }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe('debug auth roles', () => {
    it('returns roles when present on custom claim', async () => {
      mockGetSessionNormalized.mockResolvedValue({
        user: { 'https://tenon.dev/roles': ['Recruiter'] },
        accessToken: 'tok',
      });
      const mod = await import('@/app/api/debug/auth/route');
      markMetadataCovered('@/app/api/debug/auth/route');
      const res = await mod.GET();
      expect(res.status).toBe(200);
      // Body not material for coverage; ensure role path executes without throw.
    });
  });
});
