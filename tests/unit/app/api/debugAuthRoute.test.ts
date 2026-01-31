/**
 * Tests for /api/debug/auth route
 */
import { markMetadataCovered } from './coverageHelpers';

// Mock next/server before imports
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
  };
});

const mockGetSessionNormalized = jest.fn();
const mockExtractPermissions = jest.fn();

jest.mock('@/lib/auth0', () => ({
  getSessionNormalized: () => mockGetSessionNormalized(),
}));

jest.mock('@/lib/auth0-claims', () => ({
  extractPermissions: (...args: unknown[]) => mockExtractPermissions(...args),
}));

jest.mock('@/lib/brand', () => ({
  CUSTOM_CLAIM_ROLES: 'https://tenon.ai/roles',
}));

describe('/api/debug/auth route', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
    });
  });

  it('returns 404 in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
    });

    const mod = await import('@/app/api/debug/auth/route');
    markMetadataCovered('@/app/api/debug/auth/route');

    const res = await mod.GET();
    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
    });

    mockGetSessionNormalized.mockResolvedValue(null);

    const mod = await import('@/app/api/debug/auth/route');
    markMetadataCovered('@/app/api/debug/auth/route');

    const res = await mod.GET();
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Not authenticated' });
  });

  it('returns debug info when authenticated', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
    });

    const mockUser = {
      sub: 'auth0|123',
      email: 'test@example.com',
      'https://tenon.ai/roles': ['recruiter'],
    };

    mockGetSessionNormalized.mockResolvedValue({
      user: mockUser,
      accessToken: 'test-token',
    });
    mockExtractPermissions.mockReturnValue([
      'read:simulations',
      'create:invites',
    ]);

    const mod = await import('@/app/api/debug/auth/route');
    markMetadataCovered('@/app/api/debug/auth/route');

    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      userKeys: Object.keys(mockUser),
      permissions: ['read:simulations', 'create:invites'],
      roles: ['recruiter'],
    });
    expect(mockExtractPermissions).toHaveBeenCalledWith(mockUser, 'test-token');
  });

  it('handles missing user roles gracefully', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
    });

    const mockUser = {
      sub: 'auth0|123',
      roles: ['admin'], // Using roles instead of custom claim
    };

    mockGetSessionNormalized.mockResolvedValue({
      user: mockUser,
    });
    mockExtractPermissions.mockReturnValue([]);

    const mod = await import('@/app/api/debug/auth/route');
    markMetadataCovered('@/app/api/debug/auth/route');

    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(res.body.roles).toEqual(['admin']);
  });

  it('handles session without accessToken', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
    });

    const mockUser = {
      sub: 'auth0|456',
    };

    mockGetSessionNormalized.mockResolvedValue({
      user: mockUser,
      // No accessToken
    });
    mockExtractPermissions.mockReturnValue([]);

    const mod = await import('@/app/api/debug/auth/route');
    markMetadataCovered('@/app/api/debug/auth/route');

    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(mockExtractPermissions).toHaveBeenCalledWith(mockUser, null);
  });

  it('handles missing user in session', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
    });

    mockGetSessionNormalized.mockResolvedValue({
      // user is undefined
    });
    mockExtractPermissions.mockReturnValue([]);

    const mod = await import('@/app/api/debug/auth/route');
    markMetadataCovered('@/app/api/debug/auth/route');

    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(res.body.userKeys).toEqual([]);
    expect(res.body.roles).toEqual([]);
  });

  it('covers metadata exports', async () => {
    const mod = await import('@/app/api/debug/auth/route');
    markMetadataCovered('@/app/api/debug/auth/route');

    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.runtime).toBe('nodejs');
    expect(mod.revalidate).toBe(0);
    expect(mod.fetchCache).toBe('force-no-store');
  });
});
