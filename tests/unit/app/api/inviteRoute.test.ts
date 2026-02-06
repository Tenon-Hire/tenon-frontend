/**
 * Tests for /api/simulations/[id]/invite route
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
      method = 'POST';
      private body: unknown;

      constructor(url: string, body?: unknown) {
        this.url = url;
        this.nextUrl = new URL(url);
        this.headers = { get: () => null };
        this.body = body;
      }
      async json() {
        if (this.body !== undefined) return this.body;
        throw new Error('No body');
      }
    },
  };
});

const mockForwardJson = jest.fn();
const mockWithRecruiterAuth = jest.fn();

jest.mock('@/lib/server/bff', () => ({
  forwardJson: (...args: unknown[]) => mockForwardJson(...args),
}));

jest.mock('@/app/api/bffRouteHelpers', () => ({
  withRecruiterAuth: (...args: unknown[]) => mockWithRecruiterAuth(...args),
}));

describe('/api/simulations/[id]/invite route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('covers metadata exports', async () => {
    const mod = await import('@/app/api/simulations/[id]/invite/route');
    markMetadataCovered('@/app/api/simulations/[id]/invite/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');
  });

  it('calls withRecruiterAuth and forwards invite request', async () => {
    const mockResponse = { inviteUrl: 'http://invite-url' };
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

    const mod = await import('@/app/api/simulations/[id]/invite/route');
    markMetadataCovered('@/app/api/simulations/[id]/invite/route');

    const { NextRequest } = await import('next/server');
    const req = new NextRequest(
      'http://localhost/api/simulations/sim-1/invite',
      { email: 'test@example.com', name: 'Test User' },
    );

    await mod.POST(req as never, {
      params: Promise.resolve({ id: 'sim-1' }),
    });

    expect(mockWithRecruiterAuth).toHaveBeenCalledWith(
      req,
      { tag: 'invite', requirePermission: 'recruiter:access' },
      expect.any(Function),
    );

    expect(mockForwardJson).toHaveBeenCalledWith({
      path: '/api/simulations/sim-1/invite',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'test@example.com', name: 'Test User' },
      accessToken: 'token',
      requestId: 'req-123',
    });
  });

  it('handles missing request body', async () => {
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
    mockForwardJson.mockResolvedValue({});

    const mod = await import('@/app/api/simulations/[id]/invite/route');
    markMetadataCovered('@/app/api/simulations/[id]/invite/route');

    const { NextRequest } = await import('next/server');
    // Create request without body
    const req = new NextRequest(
      'http://localhost/api/simulations/sim-2/invite',
    );

    await mod.POST(req as never, {
      params: Promise.resolve({ id: 'sim-2' }),
    });

    // Should use empty object when body parse fails
    expect(mockForwardJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {},
      }),
    );
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
        return handler({ accessToken: 'token', requestId: 'req-789' });
      },
    );
    mockForwardJson.mockResolvedValue({});

    const mod = await import('@/app/api/simulations/[id]/invite/route');
    markMetadataCovered('@/app/api/simulations/[id]/invite/route');

    const { NextRequest } = await import('next/server');
    const req = new NextRequest(
      'http://localhost/api/simulations/sim%2F1/invite',
      {},
    );

    await mod.POST(req as never, {
      params: Promise.resolve({ id: 'sim/1' }),
    });

    expect(mockForwardJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/simulations/sim%2F1/invite',
      }),
    );
  });
});
