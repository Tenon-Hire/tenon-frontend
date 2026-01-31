describe('bff helpers', () => {
  let parseRetryAfterMs: (
    raw: string | null,
    now: number,
    cap: number,
  ) => number | null;
  let jitteredBackoffMs: (
    attempt: number,
    base?: number,
    cap?: number,
  ) => number;
  let getFetchDispatcher: () => unknown;
  let readRequestId: (
    h?: Headers | { get?: (k: string) => string | null },
  ) => string | null;
  let resolveRequestId: (
    h?: Headers | { get?: (k: string) => string | null },
    f?: string,
  ) => string;
  let getBackendBaseUrl: () => string;

  beforeAll(async () => {
    jest.mock('@auth0/nextjs-auth0/server', () => ({ Auth0Client: jest.fn() }));
    // Provide minimal globals required by Next polyfills during import
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).Request = class {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).Response = class {};

    const mod = await import('@/lib/server/bff');
    parseRetryAfterMs = mod.__testables.parseRetryAfterMs;
    jitteredBackoffMs = mod.__testables.jitteredBackoffMs;
    getFetchDispatcher = mod.__testables.getFetchDispatcher;
    readRequestId = mod.readRequestId;
    resolveRequestId = mod.resolveRequestId;
    getBackendBaseUrl = mod.getBackendBaseUrl;
  });

  it('parseRetryAfterMs handles numeric and date values with caps', () => {
    const now = 0;
    expect(parseRetryAfterMs('2', now, 1500)).toBe(1500); // capped 2s -> 1500ms cap
    // Use fractional seconds to avoid Date.parse rounding
    expect(parseRetryAfterMs('0.5', now, 2000)).toBe(500);
    expect(parseRetryAfterMs(null, now, 2000)).toBeNull();
    expect(parseRetryAfterMs('bad', now, 2000)).toBeNull();
  });

  it('jitteredBackoffMs returns capped jittered values', () => {
    const val = jitteredBackoffMs(3, 100, 150);
    expect(val).toBeLessThanOrEqual(150);
    expect(val).toBeGreaterThan(0);
  });

  it('getFetchDispatcher returns undefined when flag disabled or env lacks undici', () => {
    process.env.TENON_USE_FETCH_DISPATCHER = '0';
    expect(getFetchDispatcher()).toBeUndefined();
    delete process.env.TENON_USE_FETCH_DISPATCHER;
  });

  it('readRequestId and resolveRequestId fall back properly', () => {
    const headers = new Headers({ 'x-tenon-request-id': 'abc' });
    expect(readRequestId(headers)).toBe('abc');
    expect(resolveRequestId(headers, 'fallback')).toBe('abc');
    expect(resolveRequestId(undefined, 'fallback')).toBe('fallback');
  });

  it('getBackendBaseUrl strips trailing /api', () => {
    process.env.TENON_BACKEND_BASE_URL = 'http://x/api';
    expect(getBackendBaseUrl()).toBe('http://x');
    process.env.TENON_BACKEND_BASE_URL = undefined;
  });
});
