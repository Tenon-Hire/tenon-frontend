import { apiClient, __resetHttpClientCache } from '@/lib/api/client';
import { responseHelpers } from '../setup';

describe('httpClient edge cases', () => {
  const realFetch = global.fetch;
  const originalDebug = process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;

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

  it('returns undefined for 204 responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: () => 'application/json' },
    } as unknown as Response);

    const result = await apiClient.get('/no-content', { skipCache: true });
    expect(result).toBeUndefined();
  });

  it('uses detail array message when request fails', async () => {
    const body = { detail: [{ msg: 'Too long' }] };
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse(body, 422) as unknown as Response,
    );

    await expect(
      apiClient.get('/fail', { skipCache: true }),
    ).rejects.toMatchObject({
      message: 'Too long',
      status: 422,
      details: body,
    });
  });

  it('logs perf data and sanitizes sensitive params when debug is on', async () => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = '1';
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const { apiClient: debugApiClient } = await import('@/lib/api/client');
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
    );

    await debugApiClient.get(
      `/very-long-segment/${'a'.repeat(40)}?token=secret&code=${'b'.repeat(
        60,
      )}`,
      { skipCache: true },
    );

    expect(infoSpy).toHaveBeenCalled();
    const [message] = infoSpy.mock.calls[0];
    expect(message).toContain('[api][perf] GET');
    infoSpy.mockRestore();
    jest.resetModules();
  });

  it('handles non-json text error responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.textResponse('plain failure', 500) as unknown as Response,
    );

    await expect(
      apiClient.get('/text-error', { skipCache: true }),
    ).rejects.toMatchObject({
      message: 'Request failed with status 500',
      status: 500,
    });
  });

  it('sends FormData bodies without stringifying', async () => {
    const form = new FormData();
    form.append('field', 'value');
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
    );

    await apiClient.post('/form', form, { skipCache: true });
    expect((global.fetch as jest.Mock).mock.calls[0][1].body).toBe(form);
  });

  it('handles json parsing failure gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => {
        throw new Error('invalid JSON');
      },
    } as unknown as Response);

    const result = await apiClient.get('/bad-json', { skipCache: true });
    expect(result).toBeUndefined();
  });

  it('handles text parsing failure gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/plain' },
      text: async () => {
        throw new Error('text read failed');
      },
    } as unknown as Response);

    const result = await apiClient.get('/bad-text', { skipCache: true });
    expect(result).toBeUndefined();
  });

  it('extracts error detail string from response', async () => {
    const body = { detail: 'Detailed error message' };
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse(body, 400) as unknown as Response,
    );

    await expect(
      apiClient.get('/fail-detail', { skipCache: true }),
    ).rejects.toMatchObject({
      message: 'Detailed error message',
    });
  });

  it('uses fallback status message when no error detail available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({}, 403) as unknown as Response,
    );

    await expect(
      apiClient.get('/fail-no-detail', { skipCache: true }),
    ).rejects.toMatchObject({
      message: 'Request failed with status 403',
    });
  });

  it('normalizes URL with URL parsing for cache key', async () => {
    __resetHttpClientCache();
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ cached: true }) as unknown as Response,
    );

    // These URLs should normalize to the same cache key
    await apiClient.get('/cache-path?b=2&a=1', { cacheTtlMs: 5000 });
    await apiClient.get('/cache-path?a=1&b=2', { cacheTtlMs: 5000 });

    // Should only call fetch once due to normalization
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles network errors with proper error status', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network down'),
    );

    await expect(
      apiClient.get('/network-fail', { skipCache: true }),
    ).rejects.toThrow('Network down');
  });

  it('uses custom dedupeKey when provided', async () => {
    __resetHttpClientCache();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        responseHelpers.jsonResponse({ user: 1 }) as unknown as Response,
      )
      .mockResolvedValueOnce(
        responseHelpers.jsonResponse({ user: 2 }) as unknown as Response,
      );

    // Same path but different dedupe keys should result in separate requests
    const [a, b] = await Promise.all([
      apiClient.get('/dedupe', { dedupeKey: 'user-1' }),
      apiClient.get('/dedupe', { dedupeKey: 'user-2' }),
    ]);

    expect(a).toEqual({ user: 1 });
    expect(b).toEqual({ user: 2 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses put method correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ updated: true }) as unknown as Response,
    );

    await apiClient.put(
      '/resource/1',
      { name: 'updated' },
      { skipCache: true },
    );

    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('PUT');
  });

  it('uses patch method correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ patched: true }) as unknown as Response,
    );

    await apiClient.patch('/resource/1', { field: 'new' }, { skipCache: true });

    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('PATCH');
  });

  it('uses delete method correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ deleted: true }) as unknown as Response,
    );

    await apiClient.delete('/resource/1', { skipCache: true });

    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('DELETE');
  });

  it('uses provided cache option', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
    );

    await apiClient.get('/cached', { cache: 'force-cache', skipCache: true });

    expect((global.fetch as jest.Mock).mock.calls[0][1].cache).toBe(
      'force-cache',
    );
  });

  it('sanitizes path with long segments in fallback mode', async () => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'true';
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const { apiClient: debugApiClient } = await import('@/lib/api/client');
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
    );

    // Use a path that exercises the fallback sanitization
    await debugApiClient.get(`/path/${'x'.repeat(40)}`, { skipCache: true });

    expect(infoSpy).toHaveBeenCalled();
    const [message] = infoSpy.mock.calls[0];
    expect(message).toContain('[id]');
    infoSpy.mockRestore();
    jest.resetModules();
  });
});
