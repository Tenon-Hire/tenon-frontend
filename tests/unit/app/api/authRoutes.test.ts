import { MockNextRequest, MockNextResponse } from './mockNext';

const requireBffAuthMock = jest.fn();
const mergeResponseCookiesMock = jest.fn();
const forwardJsonMock = jest.fn();
const resolveRequestIdMock = jest.fn(() => 'req-auth');

jest.mock('next/server', () => {
  const { MockNextRequest, MockNextResponse } =
    jest.requireActual('./mockNext');
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: (...args: unknown[]) => requireBffAuthMock(...args),
  mergeResponseCookies: (...args: unknown[]) =>
    mergeResponseCookiesMock(...args),
}));

jest.mock('@/lib/server/bff', () => ({
  forwardJson: (...args: unknown[]) => forwardJsonMock(...args),
  resolveRequestId: (...args: unknown[]) => resolveRequestIdMock(...args),
  REQUEST_ID_HEADER: 'x-request-id',
}));

describe('auth-related API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('auth/access-token returns token on success', async () => {
    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: [],
    });
    const { GET } = await import('@/app/api/auth/access-token/route');
    const res = await GET(
      new MockNextRequest('http://localhost/api/auth/access-token'),
    );
    expect(res.status).toBe(200);
  });

  it('auth/access-token bubbles auth failure', async () => {
    const fail = MockNextResponse.json({ message: 'nope' }, { status: 401 });
    requireBffAuthMock.mockResolvedValue({
      ok: false,
      response: fail,
      cookies: [],
    });
    const { GET } = await import('@/app/api/auth/access-token/route');
    const res = await GET(
      new MockNextRequest('http://localhost/api/auth/access-token'),
    );
    expect(res.status).toBe(401);
    expect(mergeResponseCookiesMock).toHaveBeenCalled();
  });

  it('dev/access-token mirrors auth flow', async () => {
    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'dev',
      cookies: [],
    });
    const { GET } = await import('@/app/api/dev/access-token/route');
    const res = await GET(
      new MockNextRequest('http://localhost/api/dev/access-token'),
    );
    expect(res.status).toBe(200);
  });

  it('auth/me forwards profile request with request id', async () => {
    requireBffAuthMock.mockResolvedValue({
      ok: true,
      accessToken: 'me',
      cookies: [],
    });
    forwardJsonMock.mockResolvedValue(MockNextResponse.json({ ok: true }));
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(new MockNextRequest('http://localhost/api/auth/me'));
    expect(res.status).toBe(200);
    expect(forwardJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/auth/me',
        requestId: 'req-auth',
      }),
    );
  });

  it('auth/me returns auth failure path', async () => {
    const resp = MockNextResponse.json(
      { message: 'forbidden' },
      { status: 403 },
    );
    requireBffAuthMock.mockResolvedValue({
      ok: false,
      response: resp,
      cookies: [],
    });
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(new MockNextRequest('http://localhost/api/auth/me'));
    expect(res.status).toBe(403);
    expect(res.headers.get('x-request-id')).toBe('req-auth');
  });
});
