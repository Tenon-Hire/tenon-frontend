import {
  apiClient,
  __resetHttpClientCache,
} from '@/lib/api/httpClient';
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
    const { apiClient: debugApiClient } = await import('@/lib/api/httpClient');
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
});
