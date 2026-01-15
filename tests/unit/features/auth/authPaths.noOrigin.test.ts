/** @jest-environment node */

describe('authPaths buildLogoutHref without origin', () => {
  const originalAppBaseUrl = process.env.NEXT_PUBLIC_TENON_APP_BASE_URL;
  const originalVercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_TENON_APP_BASE_URL = originalAppBaseUrl;
    process.env.NEXT_PUBLIC_VERCEL_URL = originalVercelUrl;
  });

  it('omits returnTo when origin cannot be resolved', async () => {
    process.env.NEXT_PUBLIC_TENON_APP_BASE_URL = '';
    process.env.NEXT_PUBLIC_VERCEL_URL = '';
    jest.resetModules();

    const { buildLogoutHref } = await import('@/features/auth/authPaths');
    expect(buildLogoutHref()).toBe('/auth/logout');
    expect(buildLogoutHref('/dashboard')).toBe('/auth/logout');
  });
});
