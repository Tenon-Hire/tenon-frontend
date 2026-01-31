/**
 * Tests for /api/simulations/[id]/candidates route
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

const mockForwardJson = jest.fn();
const mockWithRecruiterAuth = jest.fn();

jest.mock('@/lib/server/bff', () => ({
  forwardJson: (...args: unknown[]) => mockForwardJson(...args),
}));

jest.mock('@/app/api/utils', () => ({
  withRecruiterAuth: (...args: unknown[]) => mockWithRecruiterAuth(...args),
}));

describe('/api/simulations/[id]/candidates route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('covers metadata exports', async () => {
    const mod = await import('@/app/api/simulations/[id]/candidates/route');
    markMetadataCovered('@/app/api/simulations/[id]/candidates/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');
  });

  it('calls withRecruiterAuth and forwards candidates request', async () => {
    const mockResponse = { candidates: [] };
    mockWithRecruiterAuth.mockImplementation(
      async (
        _req: unknown,
        opts: unknown,
        handler: (auth: {
          accessToken: string;
          requestId: string;
        }) => Promise<unknown>,
      ) => {
        return handler({ accessToken: 'token', requestId: 'req-123' });
      },
    );
    mockForwardJson.mockResolvedValue(mockResponse);

    const mod = await import('@/app/api/simulations/[id]/candidates/route');
    markMetadataCovered('@/app/api/simulations/[id]/candidates/route');

    const { NextRequest } = await import('next/server');
    const req = new NextRequest(
      'http://localhost/api/simulations/sim-1/candidates',
    );

    await mod.GET(req as never, {
      params: Promise.resolve({ id: 'sim-1' }),
    });

    expect(mockWithRecruiterAuth).toHaveBeenCalledWith(
      req,
      { tag: 'simulations-candidates', requirePermission: 'recruiter:access' },
      expect.any(Function),
    );

    expect(mockForwardJson).toHaveBeenCalledWith({
      path: '/api/simulations/sim-1/candidates',
      accessToken: 'token',
      requestId: 'req-123',
    });
  });

  it('encodes simulation ID in path', async () => {
    mockWithRecruiterAuth.mockImplementation(
      async (
        _req: unknown,
        _opts: unknown,
        handler: (auth: {
          accessToken: string;
          requestId: string;
        }) => Promise<unknown>,
      ) => {
        return handler({ accessToken: 'token', requestId: 'req-456' });
      },
    );
    mockForwardJson.mockResolvedValue({ candidates: [] });

    const mod = await import('@/app/api/simulations/[id]/candidates/route');
    markMetadataCovered('@/app/api/simulations/[id]/candidates/route');

    const { NextRequest } = await import('next/server');
    const req = new NextRequest(
      'http://localhost/api/simulations/sim%2F1/candidates',
    );

    await mod.GET(req as never, {
      params: Promise.resolve({ id: 'sim/1' }),
    });

    expect(mockForwardJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/simulations/sim%2F1/candidates',
      }),
    );
  });
});
