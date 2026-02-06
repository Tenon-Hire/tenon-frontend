import { NextRequest, NextResponse } from 'next/server';
import { markMetadataCovered } from './coverageHelpers';

const mockRequireBffAuth = jest.fn();
const mockMergeResponseCookies = jest.fn();
const mockForwardJson = jest.fn();
const mockResolveRequestId = jest.fn(() => 'req-utils');

jest.mock('@/lib/server/bffAuth', () => ({
  requireBffAuth: (...args: unknown[]) => mockRequireBffAuth(...args),
  mergeResponseCookies: (...args: unknown[]) =>
    mockMergeResponseCookies(...args),
}));

jest.mock('@/lib/server/bff', () => ({
  forwardJson: (...args: unknown[]) => mockForwardJson(...args),
  resolveRequestId: (...args: unknown[]) => mockResolveRequestId(...args),
  REQUEST_ID_HEADER: 'x-request-id',
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (
      body: unknown,
      init?: { status?: number; headers?: Record<string, string> },
    ) => {
      const headers = new Map<string, string>();
      Object.entries(init?.headers ?? {}).forEach(([k, v]) =>
        headers.set(k, String(v)),
      );
      return {
        status: init?.status ?? 200,
        headers: {
          set: (k: string, v: string) => headers.set(k, v),
          get: (k: string) => headers.get(k) ?? null,
        },
        body,
      };
    },
  },
}));

const importUtils = async () => await import('@/app/api/bffRouteHelpers');

describe('api utils helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('returns auth failure with request id for forwardBffWithAuth', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ message: 'nope' }, { status: 401 }),
      cookies: [],
    });
    const { forwardBffWithAuth } = await importUtils();
    markMetadataCovered('@/app/api/bffRouteHelpers.ts');
    const resp = await forwardBffWithAuth(
      { path: '/api/thing' },
      {} as unknown as NextRequest,
    );
    expect(resp.status).toBe(401);
    expect(resp.headers.get('x-request-id')).toBe('req-utils');
    expect(mockMergeResponseCookies).toHaveBeenCalled();
  });

  it('forwards with auth success and tags response', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: [],
    });
    mockForwardJson.mockResolvedValue(
      NextResponse.json({ ok: true }, { headers: { existing: '1' } }),
    );
    const { forwardBffWithAuth, BFF_HEADER } = await importUtils();
    const resp = await forwardBffWithAuth(
      { path: '/api/ok', tag: 'dash', cache: 'force-cache' },
      {} as unknown as NextRequest,
    );
    expect(mockForwardJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/ok',
        accessToken: 'tok',
        cache: 'force-cache',
        requestId: 'req-utils',
      }),
    );
    expect(resp.headers.get(BFF_HEADER)).toBe('dash');
  });

  it('wraps upstream errors from forwardJson', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: [],
    });
    mockForwardJson.mockRejectedValue(new Error('boom'));
    const { forwardBffWithAuth } = await importUtils();
    const resp = await forwardBffWithAuth(
      { path: '/api/fail' },
      {} as unknown as NextRequest,
    );
    expect(resp.status).toBe(500);
    expect(resp.headers.get('x-request-id')).toBe('req-utils');
  });

  it('withRecruiterAuth returns auth failure with headers', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ message: 'forbidden' }, { status: 403 }),
      cookies: [],
    });
    const { withRecruiterAuth } = await importUtils();
    const resp = await withRecruiterAuth(
      {} as unknown as NextRequest,
      { tag: 'dash' },
      jest.fn(),
    );
    expect(resp.status).toBe(403);
    expect(resp.headers.get('x-request-id')).toBe('req-utils');
  });

  it('withRecruiterAuth merges cookies and tags on success', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: [],
    });
    const handler = jest.fn(async () =>
      NextResponse.json({ ok: true }, { headers: { existing: 'yes' } }),
    );
    const { withRecruiterAuth, BFF_HEADER } = await importUtils();
    const resp = await withRecruiterAuth(
      {} as unknown as NextRequest,
      { tag: 'sim' },
      handler,
    );
    expect(handler).toHaveBeenCalled();
    expect(resp.headers.get(BFF_HEADER)).toBe('sim');
    expect(resp.headers.get('x-request-id')).toBe('req-utils');
  });

  it('withRecruiterAuth wraps handler errors', async () => {
    mockRequireBffAuth.mockResolvedValue({
      ok: true,
      accessToken: 'tok',
      cookies: [],
    });
    const handler = jest.fn(async () => {
      throw new Error('boom');
    });
    const { withRecruiterAuth, BFF_HEADER } = await importUtils();
    const resp = await withRecruiterAuth(
      {} as unknown as NextRequest,
      { tag: 'sim' },
      handler,
    );
    expect(resp.status).toBe(500);
    expect(resp.headers.get(BFF_HEADER)).toBe('sim');
    expect(resp.headers.get('x-request-id')).toBe('req-utils');
  });

  it('errorResponse uses default fallback and omits request id', async () => {
    const { errorResponse } = await importUtils();
    const resp = errorResponse('plain');
    expect(resp.status).toBe(500);
    // @ts-expect-error mock headers
    expect(resp.headers.get('x-request-id')).toBeNull();
  });
});
