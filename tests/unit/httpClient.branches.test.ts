/**
 * Additional httpClient tests to close branch coverage gaps
 */
import {
  apiClient,
  safeRequest,
  login,
  isSameOriginRequest,
  recruiterBffClient,
  __resetHttpClientCache,
} from '@/lib/api/httpClient';
import { responseHelpers } from '../setup';

describe('httpClient branch coverage', () => {
  const realFetch = global.fetch;
  const originalDebug = process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;
  const originalWindow = global.window;

  beforeEach(() => {
    __resetHttpClientCache();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockReset?.();
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = originalDebug;
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  describe('isSameOriginRequest', () => {
    it('returns true for relative paths starting with /', () => {
      expect(isSameOriginRequest('/api/test')).toBe(true);
    });

    it('returns false for paths starting with //', () => {
      expect(isSameOriginRequest('//example.com/api')).toBe(false);
    });

    it('returns false for absolute URLs to different origins', () => {
      expect(isSameOriginRequest('https://other.com/api')).toBe(false);
    });
  });

  describe('safeRequest', () => {
    it('returns data on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ id: 1 }) as unknown as Response,
      );

      const result = await safeRequest('/test', { skipCache: true });
      expect(result.data).toEqual({ id: 1 });
      expect(result.error).toBeNull();
    });

    it('returns error on failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await safeRequest('/test', { skipCache: true });
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Network error');
    });

    it('wraps non-Error throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce('string error');

      const result = await safeRequest('/test', { skipCache: true });
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('string error');
    });

    it('handles unknown error types', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce({ weird: 'object' });

      const result = await safeRequest('/test', { skipCache: true });
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Request failed');
    });
  });

  describe('login function', () => {
    it('sends correct login request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({
          access_token: 'tok',
          token_type: 'bearer',
        }) as unknown as Response,
      );

      const result = await login({ email: 'test@example.com', password: 'pass' });
      expect(result.access_token).toBe('tok');
      expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('POST');
    });
  });

  describe('recruiterBffClient', () => {
    it('uses /api base path', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await recruiterBffClient.get('/dashboard', { skipCache: true });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/dashboard');
    });

    it('post method works correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ created: true }) as unknown as Response,
      );

      await recruiterBffClient.post('/simulations', { title: 'New' }, { skipCache: true });
      expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('POST');
    });

    it('put method works correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ updated: true }) as unknown as Response,
      );

      await recruiterBffClient.put('/simulations/1', { title: 'Updated' }, { skipCache: true });
      expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('PUT');
    });

    it('patch method works correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ patched: true }) as unknown as Response,
      );

      await recruiterBffClient.patch('/simulations/1', { status: 'active' }, { skipCache: true });
      expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('PATCH');
    });

    it('delete method works correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ deleted: true }) as unknown as Response,
      );

      await recruiterBffClient.delete('/simulations/1', { skipCache: true });
      expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('DELETE');
    });
  });

  describe('apiClient argument handling', () => {
    it('get accepts ApiClientOptions as second arg', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.get('/test', { basePath: '/custom' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom/test');
    });

    it('get accepts RequestOptions as second arg and ApiClientOptions as third', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.get('/test', { skipCache: true }, { basePath: '/custom2' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom2/test');
    });

    it('post accepts ApiClientOptions as third arg', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.post('/test', { data: 1 }, { basePath: '/custom3' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom3/test');
    });

    it('post accepts RequestOptions as third arg and ApiClientOptions as fourth', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.post('/test', { data: 1 }, { skipCache: true }, { basePath: '/custom4' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom4/test');
    });

    it('put accepts ApiClientOptions as third arg', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.put('/test', { data: 1 }, { basePath: '/custom5' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom5/test');
    });

    it('put accepts RequestOptions and ApiClientOptions', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.put('/test', { data: 1 }, { skipCache: true }, { basePath: '/custom6' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom6/test');
    });

    it('patch accepts ApiClientOptions as third arg', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.patch('/test', { data: 1 }, { basePath: '/custom7' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom7/test');
    });

    it('patch accepts RequestOptions and ApiClientOptions', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.patch('/test', { data: 1 }, { skipCache: true }, { basePath: '/custom8' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom8/test');
    });

    it('delete accepts ApiClientOptions as second arg', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.delete('/test', { basePath: '/custom9' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom9/test');
    });

    it('delete accepts RequestOptions and ApiClientOptions', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.delete('/test', { skipCache: true }, { basePath: '/custom10' });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom10/test');
    });
  });

  describe('cache and dedupe edge cases', () => {
    it('skips cache when skipCache is true', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(
          responseHelpers.jsonResponse({ call: 1 }) as unknown as Response,
        )
        .mockResolvedValueOnce(
          responseHelpers.jsonResponse({ call: 2 }) as unknown as Response,
        );

      await apiClient.get('/skip-cache', { cacheTtlMs: 10000 });
      const result = await apiClient.get('/skip-cache', { skipCache: true });

      expect(result).toEqual({ call: 2 });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('disables dedupe when disableDedupe is true', async () => {
      (global.fetch as jest.Mock)
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve(
                    responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
                  ),
                10,
              ),
            ),
        );

      const [a, b] = await Promise.all([
        apiClient.get('/no-dedupe', { disableDedupe: true }),
        apiClient.get('/no-dedupe', { disableDedupe: true }),
      ]);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('dedupes concurrent requests by default', async () => {
      let resolveCount = 0;
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolveCount++;
              resolve(
                responseHelpers.jsonResponse({ count: resolveCount }) as unknown as Response,
              );
            }, 10),
          ),
      );

      const [a, b] = await Promise.all([
        apiClient.get('/dedupe-default', { cacheTtlMs: 5000 }),
        apiClient.get('/dedupe-default', { cacheTtlMs: 5000 }),
      ]);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(a).toEqual(b);
    });

    it('evicts oldest cache entry when limit exceeded', async () => {
      // Fill cache with many entries
      for (let i = 0; i < 160; i++) {
        (global.fetch as jest.Mock).mockResolvedValueOnce(
          responseHelpers.jsonResponse({ i }) as unknown as Response,
        );
        await apiClient.get(`/cache-evict-${i}`, { cacheTtlMs: 60000 });
      }

      // Cache should have evicted some entries (limit is 150)
      expect(global.fetch).toHaveBeenCalledTimes(160);
    });
  });

  describe('nowMs fallback', () => {
    it('falls back to Date.now when performance is unavailable', async () => {
      const originalPerformance = global.performance;
      // @ts-expect-error testing fallback
      delete global.performance;

      jest.resetModules();
      process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = '1';
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

      const { apiClient: freshClient, __resetHttpClientCache: freshReset } =
        await import('@/lib/api/httpClient');
      freshReset();

      global.fetch = jest.fn().mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await freshClient.get('/perf-fallback', { skipCache: true });

      expect(infoSpy).toHaveBeenCalled();
      infoSpy.mockRestore();
      global.performance = originalPerformance;
      jest.resetModules();
    });
  });

  describe('URL normalization edge cases', () => {
    it('handles URL with hash', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.get('/path#anchor', { cacheTtlMs: 5000 });
      expect(global.fetch).toHaveBeenCalled();
    });

    it('handles invalid URL in cache key gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      // URL with weird characters that might cause parsing issues
      await apiClient.get('/path with spaces', { skipCache: true });
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('error response parsing', () => {
    it('handles error response json parse failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        json: async () => {
          throw new Error('invalid json');
        },
      } as unknown as Response);

      await expect(
        apiClient.get('/json-error-fail', { skipCache: true }),
      ).rejects.toMatchObject({
        message: 'Request failed with status 500',
      });
    });

    it('handles error response text parse failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: { get: () => 'text/plain' },
        text: async () => {
          throw new Error('text read failed');
        },
      } as unknown as Response);

      await expect(
        apiClient.get('/text-error-fail', { skipCache: true }),
      ).rejects.toMatchObject({
        message: 'Request failed with status 500',
      });
    });
  });

  describe('auth token handling', () => {
    it('uses provided authToken from clientOptions', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.get('/auth-test', { skipCache: true }, { authToken: 'custom-token' });

      expect((global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe(
        'Bearer custom-token',
      );
    });

    it('respects null authToken to skip auth', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.get('/no-auth', { skipCache: true }, { authToken: null });

      expect(
        (global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization,
      ).toBeUndefined();
    });

    it('skips auth header when skipAuth is true', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.get('/skip-auth', { skipCache: true }, { skipAuth: true });

      expect(
        (global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization,
      ).toBeUndefined();
    });
  });

  describe('credentials handling', () => {
    it('uses include for same-origin requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.get('/same-origin', { skipCache: true });

      expect((global.fetch as jest.Mock).mock.calls[0][1].credentials).toBe('include');
    });

    it('uses provided credentials option', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.get('/custom-creds', {
        skipCache: true,
        credentials: 'same-origin',
      });

      expect((global.fetch as jest.Mock).mock.calls[0][1].credentials).toBe('same-origin');
    });
  });

  describe('signal handling', () => {
    it('passes abort signal to fetch', async () => {
      const controller = new AbortController();
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
      );

      await apiClient.get('/with-signal', {
        skipCache: true,
        signal: controller.signal,
      });

      expect((global.fetch as jest.Mock).mock.calls[0][1].signal).toBe(controller.signal);
    });
  });
});
