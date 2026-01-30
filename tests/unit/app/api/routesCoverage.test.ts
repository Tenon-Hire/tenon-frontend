/**
 * Comprehensive coverage tests for API routes
 * Ensures all route metadata and handlers are fully covered
 */
import { NextRequest, NextResponse } from 'next/server';
import { markMetadataCovered } from './coverageHelpers';

// Mock next/server before imports
jest.mock('next/server', () => {
  const buildHeaders = () => {
    const store = new Map<string, string>();
    return {
      get: (key: string) => store.get(key.toLowerCase()) ?? null,
      set: (key: string, value: string) => store.set(key.toLowerCase(), value),
      delete: (key: string) => store.delete(key.toLowerCase()),
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

  const buildResponse = (
    status = 200,
    body?: unknown,
    headers?: Record<string, string>,
  ) => ({
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
      redirect: (url: URL | string) => {
        const resp = buildResponse(307);
        resp.headers.set('location', url.toString());
        return resp;
      },
    },
    NextRequest: class {
      url: string;
      nextUrl: URL;
      headers: { get: (key: string) => string | null; forEach: (cb: (v: string, k: string) => void) => void };
      method: string;
      signal: AbortSignal;
      body: ReadableStream | null = null;
      
      constructor(
        url: URL | string,
        init?: { method?: string; headers?: Record<string, string>; body?: string },
      ) {
        this.url = url.toString();
        this.nextUrl = new URL(this.url);
        this.method = init?.method ?? 'GET';
        const headerStore = new Map<string, string>();
        Object.entries(init?.headers ?? {}).forEach(([k, v]) =>
          headerStore.set(k.toLowerCase(), String(v)),
        );
        this.headers = {
          get: (key: string) => headerStore.get(key.toLowerCase()) ?? null,
          forEach: (cb) => headerStore.forEach(cb),
        };
        // @ts-expect-error minimal AbortSignal
        this.signal = { aborted: false };
      }
      async json() {
        return {};
      }
      async text() {
        return '';
      }
      async arrayBuffer() {
        return new ArrayBuffer(0);
      }
    },
  };
});

const mockRequireBffAuth = jest.fn();
const mockMergeResponseCookies = jest.fn();

jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: (...args: unknown[]) => mockRequireBffAuth(...args),
  mergeResponseCookies: (...args: unknown[]) => mockMergeResponseCookies(...args),
}));

const mockForwardJson = jest.fn();
const mockResolveRequestId = jest.fn(() => 'req-cov');

jest.mock('@/lib/server/bff', () => ({
  forwardJson: (...args: unknown[]) => mockForwardJson(...args),
  resolveRequestId: (...args: unknown[]) => mockResolveRequestId(...args),
  REQUEST_ID_HEADER: 'x-tenon-request-id',
  UPSTREAM_HEADER: 'x-tenon-upstream-status',
  getBackendBaseUrl: () => 'http://backend',
}));

describe('API Routes Coverage - auth/me', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers route metadata and success path', async () => {
    const mod = await import('@/app/api/auth/me/route');
    markMetadataCovered('@/app/api/auth/me/route');
    
    // Check exports
    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      permissions: ['recruiter:access'],
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json({ id: 1 }));

    const res = await mod.GET(new NextRequest('http://localhost/api/auth/me'));
    expect(res.status).toBe(200);
  });
});

describe('API Routes Coverage - submissions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers route metadata and path building', async () => {
    const mod = await import('@/app/api/submissions/route');
    markMetadataCovered('@/app/api/submissions/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json([]));

    // Without search params
    let res = await mod.GET(new NextRequest('http://localhost/api/submissions'));
    expect(res.status).toBe(200);

    // With search params
    res = await mod.GET(new NextRequest('http://localhost/api/submissions?sim=1&status=active'));
    expect(res.status).toBe(200);
    expect(mockForwardJson).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: '/api/submissions?sim=1&status=active' }),
    );
  });
});

describe('API Routes Coverage - simulations/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers route metadata and id parameter', async () => {
    const mod = await import('@/app/api/simulations/[id]/route');
    markMetadataCovered('@/app/api/simulations/[id]/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json({ id: 'sim-1' }));

    const res = await mod.GET(
      new NextRequest('http://localhost/api/simulations/sim-1'),
      { params: Promise.resolve({ id: 'sim-1' }) },
    );
    expect(res.status).toBe(200);
    expect(mockForwardJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/simulations/sim-1' }),
    );
  });

  it('encodes special characters in id', async () => {
    const mod = await import('@/app/api/simulations/[id]/route');
    markMetadataCovered('@/app/api/simulations/[id]/route');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json({}));

    await mod.GET(
      new NextRequest('http://localhost/api/simulations/sim%20with%20spaces'),
      { params: Promise.resolve({ id: 'sim with spaces' }) },
    );
    expect(mockForwardJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/simulations/sim%20with%20spaces' }),
    );
  });
});

describe('API Routes Coverage - simulations/[id]/candidates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers route metadata and success', async () => {
    const mod = await import('@/app/api/simulations/[id]/candidates/route');
    markMetadataCovered('@/app/api/simulations/[id]/candidates/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json([]));

    const res = await mod.GET(
      new NextRequest('http://localhost/api/simulations/s1/candidates'),
      { params: Promise.resolve({ id: 's1' }) },
    );
    expect(res.status).toBe(200);
  });
});

describe('API Routes Coverage - simulations/[id]/invite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers route metadata and POST', async () => {
    const mod = await import('@/app/api/simulations/[id]/invite/route');
    markMetadataCovered('@/app/api/simulations/[id]/invite/route');

    expect(mod.dynamic).toBe('force-dynamic');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json({ inviteId: 'inv-1' }, { status: 201 }));

    const res = await mod.POST(
      new NextRequest('http://localhost/api/simulations/s1/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      }),
      { params: Promise.resolve({ id: 's1' }) },
    );
    expect(res.status).toBe(201);
  });
});

describe('API Routes Coverage - invite/resend', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers route metadata and POST', async () => {
    const mod = await import(
      '@/app/api/simulations/[id]/candidates/[candidateSessionId]/invite/resend/route'
    );
    markMetadataCovered(
      '@/app/api/simulations/[id]/candidates/[candidateSessionId]/invite/resend/route',
    );

    expect(mod.dynamic).toBe('force-dynamic');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json({ ok: true }));

    const res = await mod.POST(
      new NextRequest('http://localhost/api/simulations/s1/candidates/c1/invite/resend', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 's1', candidateSessionId: 'c1' }) },
    );
    expect(res.status).toBe(200);
  });
});

describe('API Routes Coverage - submissions/[submissionId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers route metadata and success', async () => {
    const mod = await import('@/app/api/submissions/[submissionId]/route');
    markMetadataCovered('@/app/api/submissions/[submissionId]/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json({ id: 'sub-1' }));

    const res = await mod.GET(
      new NextRequest('http://localhost/api/submissions/sub-1'),
      { params: Promise.resolve({ submissionId: 'sub-1' }) },
    );
    expect(res.status).toBe(200);
  });
});

describe('API Routes Coverage - dev/access-token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers route success path', async () => {
    const mod = await import('@/app/api/dev/access-token/route');
    markMetadataCovered('@/app/api/dev/access-token/route');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'dev-tok',
      cookies: NextResponse.next(),
    });

    const res = await mod.GET(new NextRequest('http://localhost/api/dev/access-token'));
    expect(res.status).toBe(200);
  });
});

describe('API Routes Coverage - health', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('covers route metadata', async () => {
    const mod = await import('@/app/api/health/route');
    markMetadataCovered('@/app/api/health/route');
    
    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');
  });
});

describe('API Routes Coverage - simulations list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers GET success', async () => {
    const mod = await import('@/app/api/simulations/route');
    markMetadataCovered('@/app/api/simulations/route');

    expect(mod.dynamic).toBe('force-dynamic');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json([]));

    const res = await mod.GET(new NextRequest('http://localhost/api/simulations'));
    expect(res.status).toBe(200);
  });

  it('covers POST success', async () => {
    const mod = await import('@/app/api/simulations/route');
    markMetadataCovered('@/app/api/simulations/route');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: NextResponse.next(),
    });
    mockForwardJson.mockResolvedValue(NextResponse.json({ id: 'new-sim' }, { status: 201 }));

    const res = await mod.POST(
      new NextRequest('http://localhost/api/simulations', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Sim' }),
      }),
    );
    expect(res.status).toBe(201);
  });
});

describe('API Routes Coverage - debug/auth', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockGetSessionNormalized = jest.fn();

  beforeAll(() => {
    jest.mock('@/lib/auth0', () => ({
      getSessionNormalized: (...args: unknown[]) => mockGetSessionNormalized(...args),
    }));
  });

  it('covers route with no session', async () => {
    jest.doMock('@/lib/auth0', () => ({
      getSessionNormalized: jest.fn().mockResolvedValue(null),
    }));
    
    jest.resetModules();
    const mod = await import('@/app/api/debug/auth/route');
    markMetadataCovered('@/app/api/debug/auth/route');

    const res = await mod.GET();
    expect(res.status).toBeDefined();
  });
});

describe('API Routes Coverage - auth/access-token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('covers route success path', async () => {
    const mod = await import('@/app/api/auth/access-token/route');
    markMetadataCovered('@/app/api/auth/access-token/route');

    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'access-tok',
      cookies: NextResponse.next(),
    });

    const res = await mod.GET(new NextRequest('http://localhost/api/auth/access-token'));
    expect(res.status).toBe(200);
  });

  it('covers route failure path', async () => {
    const mod = await import('@/app/api/auth/access-token/route');
    
    mockRequireBffAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ message: 'unauthorized' }, { status: 401 }),
      cookies: NextResponse.next(),
    });

    const res = await mod.GET(new NextRequest('http://localhost/api/auth/access-token'));
    expect(res.status).toBe(401);
  });
});
