jest.mock('next/server', () => {
  const buildHeaders = (init?: Record<string, string>) => {
    const store = new Map<string, string>();
    Object.entries(init ?? {}).forEach(([k, v]) =>
      store.set(k.toLowerCase(), v),
    );
    return {
      get: (key: string) => store.get(key.toLowerCase()) ?? null,
      set: (key: string, value: string) => store.set(key.toLowerCase(), value),
    };
  };

  return {
    NextResponse: {
      json: (
        body: unknown,
        init?: { status?: number; headers?: Record<string, string> },
      ) => ({
        status: init?.status ?? 200,
        headers: buildHeaders(init?.headers),
        body,
      }),
      redirect: (url: URL | string) => ({
        status: 307,
        headers: buildHeaders({ location: url.toString() }),
      }),
    },
  };
});

jest.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: jest.fn(),
    getAccessToken: jest.fn(),
    middleware: jest.fn(),
  },
  getAccessToken: jest.fn(),
  getSessionNormalized: jest.fn(),
}));

const realFetch = global.fetch;
const originalBackendBase = process.env.TENON_BACKEND_BASE_URL;

describe('forwardJson', () => {
  const fetchMock = jest.fn();
  let forwardJson: (typeof import('@/lib/server/bff'))['forwardJson'];
  let upstreamHeader: (typeof import('@/lib/server/bff'))['UPSTREAM_HEADER'];

  beforeEach(async () => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    const mod = await import('@/lib/server/bff');
    forwardJson = mod.forwardJson;
    upstreamHeader = mod.UPSTREAM_HEADER;
  });

  afterEach(() => {
    process.env.TENON_BACKEND_BASE_URL = originalBackendBase;
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('forwards authorization header to backend', async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      headers: {
        get: (key: string) =>
          key === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({ ok: true }),
      text: async () => JSON.stringify({ ok: true }),
    } as unknown as Response);

    const res = await forwardJson({
      path: '/api/test',
      accessToken: 'token-123',
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/test', {
      method: 'GET',
      headers: { Authorization: 'Bearer token-123' },
      body: undefined,
      cache: 'no-store',
    });
    expect(res.headers.get(upstreamHeader)).toBe('200');
  });

  it('uses BACKEND_BASE_URL when provided', async () => {
    process.env.TENON_BACKEND_BASE_URL = 'https://api.example.com';
    fetchMock.mockResolvedValue({
      status: 200,
      headers: { get: () => null },
      json: async () => ({ ok: true }),
      text: async () => JSON.stringify({ ok: true }),
    } as unknown as Response);

    await forwardJson({
      path: '/api/test',
      accessToken: 'token-123',
    });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/test', {
      method: 'GET',
      headers: { Authorization: 'Bearer token-123' },
      body: undefined,
      cache: 'no-store',
    });
  });
});
