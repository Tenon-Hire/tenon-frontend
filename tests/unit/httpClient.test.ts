import {
  apiClient,
  isSameOriginRequest,
  recruiterBffClient,
  __resetHttpClientCache,
} from '@/lib/api/httpClient';
import { responseHelpers } from '../setup';

describe('httpClient', () => {
  const realFetch = global.fetch;
  const originalApiBase = process.env.NEXT_PUBLIC_TENON_API_BASE_URL;

  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockReset?.();
    process.env.NEXT_PUBLIC_TENON_API_BASE_URL = originalApiBase;
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('detects same-origin requests safely', () => {
    expect(isSameOriginRequest('/api/test')).toBe(true);
    expect(isSameOriginRequest('https://example.com/api')).toBe(false);
  });

  it('falls back to relative check when URL parsing fails', () => {
    expect(isSameOriginRequest('http://[::1')).toBe(false);
    expect(isSameOriginRequest('/relative/path')).toBe(true);
  });

  it('falls back to relative check on server without window', () => {
    const originalWindow = (global as unknown as { window?: unknown }).window;
    const globalWindow = global as unknown as { window?: unknown };
    delete globalWindow.window;

    expect(isSameOriginRequest('/api/ok')).toBe(true);
    expect(isSameOriginRequest('https://other.com/foo')).toBe(false);
    expect(isSameOriginRequest('//other.com/foo')).toBe(false);

    (global as unknown as { window?: unknown }).window = originalWindow;
  });

  it('includes credentials for same-origin BFF calls', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
    );

    await recruiterBffClient.get('/simulations');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/simulations',
      expect.objectContaining({
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('omits credentials for absolute backend origins', async () => {
    process.env.NEXT_PUBLIC_TENON_API_BASE_URL =
      'https://backend.example.com/api';
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
    );

    await apiClient.get('/candidate/invites', undefined, {
      basePath: 'https://backend.example.com/api',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://backend.example.com/api/candidate/invites',
      expect.objectContaining({
        credentials: 'omit',
      }),
    );
  });

  it('dedupes concurrent GETs and only fetches once', async () => {
    __resetHttpClientCache();
    const resolver: ((value: Response) => void)[] = [];
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolver.push(resolve);
        }),
    );

    const p1 = apiClient.get('/dedupe-check');
    const p2 = apiClient.get('/dedupe-check');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolver[0](
      responseHelpers.jsonResponse({ ok: true }) as unknown as Response,
    );

    await expect(Promise.all([p1, p2])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
  });

  it('does not cache responses unless cacheTtlMs > 0', async () => {
    __resetHttpClientCache();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        responseHelpers.jsonResponse({ value: 1 }) as unknown as Response,
      )
      .mockResolvedValueOnce(
        responseHelpers.jsonResponse({ value: 2 }) as unknown as Response,
      );

    const first = await apiClient.get('/no-cache');
    const second = await apiClient.get('/no-cache');

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 2 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
