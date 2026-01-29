import { MockNextRequest, MockNextResponse, makeResponse } from './mockNext';

const requireBffAuthMock = jest.fn();
const mergeResponseCookiesMock = jest.fn();
const upstreamRequestMock = jest.fn();
const parseUpstreamBodyMock = jest.fn();
const forwardJsonMock = jest.fn();

jest.mock('next/server', () => {
  const { MockNextRequest, MockNextResponse } = jest.requireActual(
    './mockNext',
  );
  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: (...args: unknown[]) => requireBffAuthMock(...args),
  mergeResponseCookies: (...args: unknown[]) => mergeResponseCookiesMock(...args),
}));

jest.mock('@/lib/server/bff', () => ({
  REQUEST_ID_HEADER: 'x-request-id',
  UPSTREAM_HEADER: 'x-upstream',
  getBackendBaseUrl: () => 'http://backend',
  upstreamRequest: (...args: unknown[]) => upstreamRequestMock(...args),
  parseUpstreamBody: (...args: unknown[]) => parseUpstreamBodyMock(...args),
  forwardJson: (...args: unknown[]) => forwardJsonMock(...args),
  resolveRequestId: () => 'req-1',
}));

describe('recruiter API routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'token-123',
      cookies: new MockNextResponse(),
      response: new MockNextResponse(null, { status: 401 }),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('dashboard route', () => {
    const modulePath = '@/app/api/dashboard/route';

    it('returns unauthorized when profile upstream returns 401', async () => {
      upstreamRequestMock.mockResolvedValueOnce(
        makeResponse(JSON.stringify({ message: 'nope' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      );
      upstreamRequestMock.mockResolvedValueOnce(
        makeResponse(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
      parseUpstreamBodyMock
        .mockResolvedValueOnce({ message: 'nope' })
        .mockResolvedValueOnce([]);

      const { GET } = await import(modulePath);
      const resp = await GET(new MockNextRequest('http://localhost/api/dash'));

      expect(resp.status).toBe(401);
      expect(resp.headers.get('x-upstream')).toBe('401');
      expect(resp.headers.get('x-tenon-upstream-status-profile')).toBe('401');
    });

    it('returns forbidden when simulations upstream is 403', async () => {
      upstreamRequestMock.mockResolvedValueOnce(
        makeResponse(JSON.stringify({ name: 'Recruiter' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
      upstreamRequestMock.mockResolvedValueOnce(
        makeResponse(JSON.stringify({ message: 'forbidden' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }),
      );
      parseUpstreamBodyMock
        .mockResolvedValueOnce({ name: 'Recruiter' })
        .mockResolvedValueOnce({ message: 'forbidden' });

      const { GET } = await import(modulePath);
      const resp = await GET(new MockNextRequest('http://localhost/api/dash'));

      expect(resp.status).toBe(403);
      expect(resp.headers.get('x-upstream')).toBe('403');
      expect(resp.headers.get('x-tenon-upstream-status-simulations')).toBe(
        '403',
      );
    });

    it('returns combined payload with upstream errors', async () => {
      upstreamRequestMock.mockResolvedValueOnce(
        makeResponse(JSON.stringify({ message: 'profile down' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      );
      upstreamRequestMock.mockResolvedValueOnce(
        makeResponse(JSON.stringify({ message: 'sims fail' }), {
          status: 502,
          headers: { 'content-type': 'application/json' },
        }),
      );
      parseUpstreamBodyMock
        .mockResolvedValueOnce({ message: 'profile down' })
        .mockResolvedValueOnce({ message: 'sims fail' });

      const { GET } = await import(modulePath);
      const resp = await GET(new MockNextRequest('http://localhost/api/dash'));

      expect(resp.status).toBe(200);
      expect(resp.headers.get('x-upstream')).toBe('502');
      expect(resp.body).toMatchObject({
        profile: null,
        simulations: [],
        profileError: 'profile down',
        simulationsError: 'sims fail',
      });
    });

    it('includes retry count in server timing', async () => {
      const profileResp = makeResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as Response & { _tenonMeta?: unknown };
      profileResp._tenonMeta = { attempts: 2, durationMs: 10 };
      const simsResp = makeResponse(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as Response & { _tenonMeta?: unknown };
      simsResp._tenonMeta = { attempts: 1, durationMs: 5 };

      upstreamRequestMock.mockResolvedValueOnce(profileResp);
      upstreamRequestMock.mockResolvedValueOnce(simsResp);
      parseUpstreamBodyMock.mockResolvedValueOnce({ ok: true });
      parseUpstreamBodyMock.mockResolvedValueOnce([]);

      const { GET } = await import(modulePath);
      const resp = await GET(new MockNextRequest('http://localhost/api/dash'));

      expect(resp.status).toBe(200);
      expect(resp.headers.get('Server-Timing')).toContain('retry;desc="count=1"');
      expect(resp.headers.get('x-tenon-bff')).toBe('dashboard');
    });
  });

  describe('simulations routes', () => {
    it('GET /api/simulations forwards with auth', async () => {
      forwardJsonMock.mockResolvedValue(new MockNextResponse({ ok: true }));
      const { GET } = await import('@/app/api/simulations/route');
      const resp = await GET(new MockNextRequest('http://localhost/api/sim'));

      expect(resp.status).toBe(200);
      expect(forwardJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/simulations',
          accessToken: 'token-123',
          requestId: 'req-1',
        }),
      );
    });

    it('POST /api/simulations returns 400 for invalid JSON', async () => {
      const { POST } = await import('@/app/api/simulations/route');
      const req = new MockNextRequest('http://localhost/api/sim', {
        method: 'POST',
        bodyText: 'not-json',
      });
      const resp = await POST(req, { params: Promise.resolve({}) as any });
      expect(resp.status).toBe(400);
    });

    it('POST /api/simulations forwards parsed body', async () => {
      forwardJsonMock.mockResolvedValue(new MockNextResponse({ ok: true }));
      const { POST } = await import('@/app/api/simulations/route');
      const req = new MockNextRequest('http://localhost/api/sim', {
        method: 'POST',
        bodyText: JSON.stringify({ title: 'New Sim' }),
      });
      const resp = await POST(req, { params: Promise.resolve({}) as any });

      expect(resp.status).toBe(200);
      expect(forwardJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/simulations',
          method: 'POST',
          body: { title: 'New Sim' },
        }),
      );
    });

    it('GET /api/simulations/[id] encodes path param', async () => {
      forwardJsonMock.mockResolvedValue(new MockNextResponse({ ok: true }));
      const { GET } = await import('@/app/api/simulations/[id]/route');
      const resp = await GET(new MockNextRequest('http://x'), {
        params: Promise.resolve({ id: 'abc 123' }),
      });
      expect(resp.status).toBe(200);
      expect(forwardJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/simulations/abc%20123',
        }),
      );
    });

    it('GET /api/simulations/[id]/candidates forwards correctly', async () => {
      forwardJsonMock.mockResolvedValue(new MockNextResponse({ ok: true }));
      const { GET } = await import(
        '@/app/api/simulations/[id]/candidates/route'
      );
      await GET(new MockNextRequest('http://x'), {
        params: Promise.resolve({ id: 'sim-9' }),
      });
      expect(forwardJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/simulations/sim-9/candidates',
        }),
      );
    });

    it('POST invite uses payload even when json fails', async () => {
      forwardJsonMock.mockResolvedValue(new MockNextResponse({ ok: true }));
      const { POST } = await import('@/app/api/simulations/[id]/invite/route');
      const req = new MockNextRequest('http://x', {
        method: 'POST',
        bodyText: 'invalid',
      });
      await POST(req, { params: Promise.resolve({ id: 'sim-1' }) });
      expect(forwardJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/simulations/sim-1/invite',
          body: {},
        }),
      );
    });

    it('resend invite forwards to candidate-specific path', async () => {
      forwardJsonMock.mockResolvedValue(new MockNextResponse({ ok: true }));
      const { POST } = await import(
        '@/app/api/simulations/[id]/candidates/[candidateSessionId]/invite/resend/route'
      );
      await POST(new MockNextRequest('http://x'), {
        params: Promise.resolve({ id: 'sim-1', candidateSessionId: 'cand-7' }),
      });
      expect(forwardJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/simulations/sim-1/candidates/cand-7/invite/resend',
        }),
      );
    });
  });

  describe('submissions routes', () => {
    it('builds query string for submissions list', async () => {
      forwardJsonMock.mockResolvedValue(new MockNextResponse({ items: [] }));
      const { GET } = await import('@/app/api/submissions/route');
      const req = new MockNextRequest(
        'http://localhost/api/submissions?candidateSessionId=9',
      );
      const resp = await GET(req);
      expect(resp.status).toBe(200);
      expect(forwardJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/submissions?candidateSessionId=9',
        }),
      );
    });

    it('returns error response when submissionId is missing', async () => {
      const { GET } = await import('@/app/api/submissions/[submissionId]/route');
      const resp = await GET(new MockNextRequest('http://x'), {
        params: Promise.resolve({ submissionId: '' }),
      });
      expect(resp.status).toBe(500);
      expect(resp.body).toMatchObject({ message: 'Bad request' });
    });

    it('forwards submission detail when id present', async () => {
      forwardJsonMock.mockResolvedValue(new MockNextResponse({ ok: true }));
      const { GET } = await import('@/app/api/submissions/[submissionId]/route');
      const resp = await GET(new MockNextRequest('http://x'), {
        params: Promise.resolve({ submissionId: '42' }),
      });
      expect(forwardJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/submissions/42',
        }),
      );
      expect(
        (forwardJsonMock.mock.calls[0]?.[0] as { accessToken?: string })?.accessToken,
      ).toBe('token-123');
      expect(resp.headers.get('x-tenon-bff')).toBe('submission-detail');
    });
  });
});
