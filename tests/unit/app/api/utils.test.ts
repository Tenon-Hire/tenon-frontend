import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, forwardWithAuth, withRecruiterAuth } from '@/app/api/utils';

const mockRequireBffAuth = jest.fn();
const mockMergeResponseCookies = jest.fn();
const mockForwardJson = jest.fn();
const mockResolveRequestId = jest.fn(() => 'req-123');

jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: (...args: unknown[]) => mockRequireBffAuth(...args),
  mergeResponseCookies: (...args: unknown[]) => mockMergeResponseCookies(...args),
}));

jest.mock('@/lib/server/bff', () => ({
  forwardJson: (...args: unknown[]) => mockForwardJson(...args),
  resolveRequestId: (...args: unknown[]) => mockResolveRequestId(...args),
  REQUEST_ID_HEADER: 'x-request-id',
}));

describe('api utils forwardWithAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth response when requireBffAuth fails', async () => {
    const response = NextResponse.json({ message: 'nope' }, { status: 401 });
    mockRequireBffAuth.mockResolvedValue({
      ok: false,
      response,
      cookies: [],
    });

    const req = new NextRequest('http://localhost/api/test');
    const result = await forwardWithAuth({ path: '/api/test' }, req);

    expect(result.status).toBe(401);
    expect(result.headers.get('x-request-id')).toBe('req-123');
    expect(mockMergeResponseCookies).toHaveBeenCalled();
    expect(mockForwardJson).not.toHaveBeenCalled();
  });

  it('forwards request with access token and sets headers', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'token-abc',
      cookies: [],
    });
    mockForwardJson.mockResolvedValue(NextResponse.json({ ok: true }));

    const req = new NextRequest('http://localhost/api/ok');
    const result = await forwardWithAuth(
      { path: '/api/ok', tag: 'tagged' },
      req,
    );

    expect(mockForwardJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/ok',
        accessToken: 'token-abc',
        cache: 'no-store',
        requestId: 'req-123',
      }),
    );
    expect(result.headers.get('x-request-id')).toBe('req-123');
    expect(result.headers.get('x-tenon-bff')).toBe('tagged');
  });

  it('wraps upstream errors with errorResponse and merges cookies', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'token-abc',
      cookies: [],
    });
    mockForwardJson.mockRejectedValue(new Error('upstream boom'));

    const req = new NextRequest('http://localhost/api/error');
    const result = await forwardWithAuth(
      { path: '/api/error', tag: 'err' },
      req,
    );

    expect(result.status).toBe(500);
    expect(result.headers.get('x-request-id')).toBe('req-123');
    expect(result.headers.get('x-tenon-bff')).toBe('err');
    expect(mockMergeResponseCookies).toHaveBeenCalled();
  });
});

describe('api utils withRecruiterAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth response when recruiter auth fails', async () => {
    const resp = NextResponse.json({ message: 'forbidden' }, { status: 403 });
    mockRequireBffAuth.mockResolvedValue({
      ok: false,
      response: resp,
      cookies: [],
    });
    const req = new NextRequest('http://localhost/api/protected');

    const result = await withRecruiterAuth(
      req,
      { tag: 'dash' },
      async () => NextResponse.next(),
    );

    expect(result.status).toBe(403);
    expect(result.headers.get('x-request-id')).toBe('req-123');
    expect(mockMergeResponseCookies).toHaveBeenCalled();
  });

  it('runs handler, sets tag + request id, merges cookies', async () => {
    const handlerResp = NextResponse.json({ ok: true });
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'token-xyz',
      cookies: [],
      requestId: 'req-123',
    });
    const req = new NextRequest('http://localhost/api/protected');

    const result = await withRecruiterAuth(
      req,
      { tag: 'recruiter' },
      async () => handlerResp,
    );

    expect(result.headers.get('x-tenon-bff')).toBe('recruiter');
    expect(result.headers.get('x-request-id')).toBe('req-123');
    expect(mockMergeResponseCookies).toHaveBeenCalled();
  });

  it('wraps handler errors into errorResponse', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'token-xyz',
      cookies: [],
      requestId: 'req-123',
    });
    const req = new NextRequest('http://localhost/api/protected');
    const result = await withRecruiterAuth(
      req,
      { tag: 'recruiter' },
      async () => {
        throw new Error('handler failed');
      },
    );

    expect(result.status).toBe(500);
    expect(result.headers.get('x-tenon-bff')).toBe('recruiter');
    expect(result.headers.get('x-request-id')).toBe('req-123');
  });
});

describe('api utils errorResponse', () => {
  it('adds request id header when provided', () => {
    const resp = errorResponse(new Error('bad'), 'fallback', 'req-999');
    expect(resp.headers.get('x-request-id')).toBe('req-999');
  });
});
