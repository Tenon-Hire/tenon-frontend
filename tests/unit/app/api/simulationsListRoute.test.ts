/**
 * Tests for /api/simulations route (GET and POST)
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

describe('/api/simulations route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('covers metadata exports', async () => {
    const mod = await import('@/app/api/simulations/route');
    markMetadataCovered('@/app/api/simulations/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');
  });

  describe('GET', () => {
    it('forwards request to list simulations', async () => {
      const mockResponse = { simulations: [] };
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

      const mod = await import('@/app/api/simulations/route');
      markMetadataCovered('@/app/api/simulations/route');

      const { NextRequest } = await import('next/server');
      const req = new NextRequest('http://localhost/api/simulations');

      await mod.GET(req as never);

      expect(mockWithRecruiterAuth).toHaveBeenCalledWith(
        req,
        { tag: 'simulations-list', requirePermission: 'recruiter:access' },
        expect.any(Function),
      );

      expect(mockForwardJson).toHaveBeenCalledWith({
        path: '/api/simulations',
        accessToken: 'token',
        requestId: 'req-123',
      });
    });
  });

  describe('POST', () => {
    it('forwards request to create simulation', async () => {
      const mockResponse = { id: 'new-sim' };
      mockWithRecruiterAuth.mockImplementation(
        async (
          _req: unknown,
          opts: unknown,
          handler: (auth: {
            accessToken: string;
            requestId: string;
          }) => Promise<unknown>,
        ) => {
          return handler({ accessToken: 'token', requestId: 'req-456' });
        },
      );
      mockForwardJson.mockResolvedValue(mockResponse);

      const mod = await import('@/app/api/simulations/route');
      markMetadataCovered('@/app/api/simulations/route');

      const { NextRequest } = await import('next/server');
      const req = new NextRequest('http://localhost/api/simulations', {
        title: 'New Simulation',
        templateId: 'template-1',
      });

      await mod.POST(req as never);

      expect(mockWithRecruiterAuth).toHaveBeenCalledWith(
        req,
        { tag: 'simulations-create', requirePermission: 'recruiter:access' },
        expect.any(Function),
      );

      expect(mockForwardJson).toHaveBeenCalledWith({
        path: '/api/simulations',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { title: 'New Simulation', templateId: 'template-1' },
        accessToken: 'token',
        requestId: 'req-456',
      });
    });

    it('returns 400 when body is invalid', async () => {
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

      const mod = await import('@/app/api/simulations/route');
      markMetadataCovered('@/app/api/simulations/route');

      const { NextRequest } = await import('next/server');
      // Create request without body that will throw on json()
      const req = new NextRequest('http://localhost/api/simulations');

      const res = await mod.POST(req as never);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Bad request' });
    });
  });
});
