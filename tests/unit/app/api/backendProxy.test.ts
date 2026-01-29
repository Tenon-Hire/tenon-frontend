import { TextEncoder } from 'util';
import { MockNextRequest, MockNextResponse, makeResponse } from './mockNext';

const upstreamRequestMock = jest.fn();
const parseUpstreamBodyMock = jest.fn();
const getBackendBaseUrlMock = jest.fn(() => 'http://backend');
const resolveRequestIdMock = jest.fn(() => 'req-1');

jest.mock('next/server', () => {
  const { MockNextRequest, MockNextResponse } = jest.requireActual(
    './mockNext',
  );
  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

jest.mock('@/lib/server/bff', () => ({
  REQUEST_ID_HEADER: 'x-request-id',
  UPSTREAM_HEADER: 'x-upstream',
  upstreamRequest: (...args: unknown[]) => upstreamRequestMock(...args),
  parseUpstreamBody: (...args: unknown[]) => parseUpstreamBodyMock(...args),
  getBackendBaseUrl: (...args: unknown[]) => getBackendBaseUrlMock(...args),
  resolveRequestId: (...args: unknown[]) => resolveRequestIdMock(...args),
}));

describe('api/backend proxy route', () => {
  const modulePath = '@/app/api/backend/[...path]/route';
  const originalEnv = { ...process.env };

  const importRoute = async () =>
    await import(modulePath).then((mod) => ({ ...mod }));

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    resolveRequestIdMock.mockReturnValue('req-1');
    getBackendBaseUrlMock.mockReturnValue('http://backend');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 400 when request body cannot be read', async () => {
    const { POST } = await importRoute();
    const req = new MockNextRequest('http://localhost/api/backend/tasks/run', {
      method: 'POST',
      headers: { 'content-length': '10' },
      failOnRead: true,
    });
    const resp = await POST(req, {
      params: Promise.resolve({ path: ['tasks', '123', 'run'] }),
    });

    expect(resp.status).toBe(400);
    expect(resp.headers.get('x-request-id')).toBe('req-1');
    expect(resp.headers.get('x-upstream')).toBe('400');
  });

  it('returns 413 when body exceeds configured limit', async () => {
    process.env.TENON_PROXY_MAX_BODY_BYTES = '5';
    const { POST } = await importRoute();
    const req = new MockNextRequest('http://localhost/api/backend/tasks/run', {
      method: 'POST',
      headers: { 'content-length': '10' },
      bodyText: '0123456789',
    });

    const resp = await POST(req, {
      params: Promise.resolve({ path: ['tasks', '123', 'run'] }),
    });

    expect(resp.status).toBe(413);
    expect(resp.headers.get('x-upstream')).toBe('413');
  });

  it('blocks upstream redirects and strips location header', async () => {
    upstreamRequestMock.mockResolvedValue(
      makeResponse('', {
        status: 302,
        headers: { location: 'http://redirected' },
      }),
    );
    const { GET } = await importRoute();
    const req = new MockNextRequest('http://localhost/api/backend/health');
    const resp = await GET(req, { params: Promise.resolve({ path: [] }) });

    expect(resp.status).toBe(502);
    expect(resp.headers.get('x-upstream')).toBe('302');
    expect(resp.headers.get('location')).toBeNull();
  });

  it('parses JSON responses and attaches retry metadata', async () => {
    const upstream = makeResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }) as Response & { _tenonMeta?: unknown };
    upstream._tenonMeta = { attempts: 2, durationMs: 50 };
    upstreamRequestMock.mockResolvedValue(upstream);

    const { GET } = await importRoute();
    const req = new MockNextRequest('http://localhost/api/backend/thing');
    const resp = await GET(req, { params: Promise.resolve({ path: [] }) });

    expect(resp.status).toBe(200);
    expect(resp.headers.get('x-upstream')).toBe('200');
    expect(resp.headers.get('x-request-id')).toBe('req-1');
    expect(resp.headers.get('Server-Timing')).toContain('retry;desc="count=1"');
  });

  it('falls back to parseUpstreamBody when stream is empty', async () => {
    const upstream = makeResponse(null, {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
    upstreamRequestMock.mockResolvedValue(upstream);
    parseUpstreamBodyMock.mockResolvedValue({ ok: 'fallback' });

    const { GET } = await importRoute();
    const req = new MockNextRequest('http://localhost/api/backend/empty');
    const resp = await GET(req, { params: Promise.resolve({ path: [] }) });

    expect(parseUpstreamBodyMock).toHaveBeenCalled();
    expect(resp.status).toBe(201);
    expect(resp.headers.get('x-upstream')).toBe('201');
  });

  it('rejects responses with oversized content-length header', async () => {
    process.env.TENON_PROXY_MAX_RESPONSE_BYTES = '5';
    upstreamRequestMock.mockResolvedValue(
      makeResponse('oversized', {
        status: 200,
        headers: { 'content-type': 'text/plain', 'content-length': '25' },
      }),
    );

    const { GET } = await importRoute();
    const req = new MockNextRequest('http://localhost/api/backend/text');
    const resp = await GET(req, { params: Promise.resolve({ path: [] }) });

    expect(resp.status).toBe(502);
    expect(resp.headers.get('x-upstream')).toBe('200');
  });

  it('terminates when streamed body exceeds limit', async () => {
    process.env.TENON_PROXY_MAX_RESPONSE_BYTES = '5';
    upstreamRequestMock.mockResolvedValue(
      makeResponse('abcdefg', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    const { GET } = await importRoute();
    const req = new MockNextRequest('http://localhost/api/backend/text');
    const resp = await GET(req, { params: Promise.resolve({ path: [] }) });

    expect(resp.status).toBe(502);
    expect(resp.headers.get('x-upstream')).toBe('200');
  });

  it('uses long timeout for run endpoints', async () => {
    upstreamRequestMock.mockResolvedValue(
      makeResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const { POST } = await importRoute();
    const req = new MockNextRequest(
      'http://localhost/api/backend/tasks/123/run',
      {
        method: 'POST',
        bodyText: '{}',
      },
    );
    await POST(req, {
      params: Promise.resolve({ path: ['tasks', '123', 'run'] }),
    });

    expect(upstreamRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 90000 }),
    );
  });

  it('returns 502 when upstreamRequest throws', async () => {
    upstreamRequestMock.mockRejectedValue(new Error('boom'));
    const { GET } = await importRoute();
    const req = new MockNextRequest('http://localhost/api/backend/err');
    const resp = await GET(req, { params: Promise.resolve({ path: [] }) });

    expect(resp.status).toBe(502);
    expect(resp.headers.get('x-upstream')).toBe('502');
  });

  it('logs when debug flags enabled', async () => {
    process.env.TENON_DEBUG = 'true';
    process.env.TENON_DEBUG_PERF = '1';
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    upstreamRequestMock.mockResolvedValue(
      makeResponse(JSON.stringify({ ok: true }), {
        status: 204,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { GET } = await importRoute();
    const req = new MockNextRequest('http://localhost/api/backend/path');
    const resp = await GET(req, { params: Promise.resolve({ path: [] }) });
    expect(resp.status).toBe(204);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('blocks oversized JSON streams', async () => {
    process.env.TENON_PROXY_MAX_RESPONSE_BYTES = '2';
    upstreamRequestMock.mockResolvedValue(
      makeResponse(JSON.stringify({ msg: 'way too long' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { GET } = await importRoute();
    const resp = await GET(
      new MockNextRequest('http://localhost/api/backend/json'),
      { params: Promise.resolve({ path: [] }) },
    );
    expect(resp.status).toBe(502);
    expect(resp.headers.get('x-upstream')).toBe('200');
  });

  it('uses fallback arrayBuffer limit for non-JSON responses', async () => {
    process.env.TENON_PROXY_MAX_RESPONSE_BYTES = '3';
    const oversizedBuffer = new TextEncoder().encode('abcdefgh').buffer;
    const upstream = {
      status: 200,
      headers: new (jest.requireActual('./mockNext').MockHeaders)({
        'content-type': 'text/plain',
      }),
      body: null,
      arrayBuffer: async () => oversizedBuffer,
    } as unknown as Response;
    upstreamRequestMock.mockResolvedValue(upstream);

    const { GET } = await importRoute();
    const resp = await GET(
      new MockNextRequest('http://localhost/api/backend/plain'),
      { params: Promise.resolve({ path: [] }) },
    );
    expect(resp.status).toBe(502);
  });

  it('handles arrayBuffer errors gracefully', async () => {
    const upstream = {
      status: 201,
      headers: new (jest.requireActual('./mockNext').MockHeaders)({
        'content-type': 'text/plain',
      }),
      body: null,
      arrayBuffer: async () => {
        throw new Error('fail');
      },
    } as unknown as Response;
    upstreamRequestMock.mockResolvedValue(upstream);
    const { GET } = await importRoute();
    const resp = await GET(
      new MockNextRequest('http://localhost/api/backend/plain'),
      { params: Promise.resolve({ path: [] }) },
    );
    expect(resp.status).toBe(201);
  });

  it('routes all HTTP verbs through proxy', async () => {
    upstreamRequestMock.mockResolvedValue(
      makeResponse('ok', { status: 200, headers: { 'content-type': 'text/plain' } }),
    );
    const mod = await importRoute();
    const ctx = { params: Promise.resolve({ path: [] }) };
    await mod.HEAD(new MockNextRequest('http://x', { method: 'HEAD' }), ctx as any);
    await mod.PUT(new MockNextRequest('http://x', { method: 'PUT' }), ctx as any);
    await mod.PATCH(new MockNextRequest('http://x', { method: 'PATCH' }), ctx as any);
    await mod.DELETE(new MockNextRequest('http://x', { method: 'DELETE' }), ctx as any);
    await mod.OPTIONS(new MockNextRequest('http://x', { method: 'OPTIONS' }), ctx as any);
    expect(upstreamRequestMock).toHaveBeenCalledTimes(5);
  });
});
