/**
 * Tests for /api/submissions/[submissionId] route
 */
import { markMetadataCovered } from './coverageHelpers';

// Mock next/server
jest.mock('next/server', () => {
  const buildResponse = (status = 200, body?: unknown) => ({
    status,
    body,
    headers: { get: () => null, set: () => {} },
    cookies: { set: () => {}, getAll: () => [] },
    json: async () => body,
  });

  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) =>
        buildResponse(init?.status ?? 200, body),
    },
    NextRequest: class {
      url: string;
      nextUrl: URL;
      headers: { get: () => null };
      method = 'GET';

      constructor(url: string) {
        this.url = url;
        this.nextUrl = new URL(url);
        this.headers = { get: () => null };
      }
    },
  };
});

const mockErrorResponse = jest.fn();
const mockForwardWithAuth = jest.fn();

jest.mock('@/app/api/bffRouteHelpers', () => ({
  errorResponse: (...args: unknown[]) => mockErrorResponse(...args),
  forwardBffWithAuth: (...args: unknown[]) => mockForwardWithAuth(...args),
}));

describe('/api/submissions/[submissionId] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('covers metadata exports', async () => {
    const mod = await import('@/app/api/submissions/[submissionId]/route');
    markMetadataCovered('@/app/api/submissions/[submissionId]/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');
  });

  it('forwards request with submissionId', async () => {
    const mockResponse = { submission: {} };
    mockForwardWithAuth.mockResolvedValue(mockResponse);

    const mod = await import('@/app/api/submissions/[submissionId]/route');
    markMetadataCovered('@/app/api/submissions/[submissionId]/route');

    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/api/submissions/sub-123');

    await mod.GET(req as never, {
      params: Promise.resolve({ submissionId: 'sub-123' }),
    });

    expect(mockForwardWithAuth).toHaveBeenCalledWith(
      {
        path: '/api/submissions/sub-123',
        tag: 'submission-detail',
        requirePermission: 'recruiter:access',
      },
      req,
    );
  });

  it('encodes submissionId in path', async () => {
    mockForwardWithAuth.mockResolvedValue({});

    const mod = await import('@/app/api/submissions/[submissionId]/route');
    markMetadataCovered('@/app/api/submissions/[submissionId]/route');

    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/api/submissions/sub%2F123');

    await mod.GET(req as never, {
      params: Promise.resolve({ submissionId: 'sub/123' }),
    });

    expect(mockForwardWithAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/submissions/sub%2F123',
      }),
      req,
    );
  });

  it('returns error when submissionId is missing', async () => {
    const errorResp = { status: 400, body: { message: 'Bad request' } };
    mockErrorResponse.mockReturnValue(errorResp);

    const mod = await import('@/app/api/submissions/[submissionId]/route');
    markMetadataCovered('@/app/api/submissions/[submissionId]/route');

    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/api/submissions/');

    const res = await mod.GET(req as never, {
      params: Promise.resolve({ submissionId: '' }),
    });

    expect(mockErrorResponse).toHaveBeenCalledWith(
      'Missing submission id',
      'Bad request',
    );
    expect(res).toBe(errorResp);
  });
});
