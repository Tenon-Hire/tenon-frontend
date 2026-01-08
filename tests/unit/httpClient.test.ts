import {
  apiClient,
  isSameOriginRequest,
  recruiterBffClient,
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
});
