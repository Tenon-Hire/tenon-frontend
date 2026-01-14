import { fetchAuthAccessToken } from '@/lib/auth/accessToken';

describe('fetchAuthAccessToken', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns access token from BFF response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accessToken: 'tok_123' }),
    }) as unknown as typeof fetch;

    await expect(fetchAuthAccessToken()).resolves.toBe('tok_123');
  });

  it('throws when access token is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(fetchAuthAccessToken()).rejects.toThrow(
      'Access token missing from response',
    );
  });
});
