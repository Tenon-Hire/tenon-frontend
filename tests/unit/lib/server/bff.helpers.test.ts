import { MessageChannel, MessagePort } from 'worker_threads';
import { ReadableStream } from 'stream/web';

jest.mock('@/lib/auth0', () => ({
  getAccessToken: jest.fn(),
  getSessionNormalized: jest.fn(),
}));

jest.mock('undici', () => ({
  Agent: class MockAgent {},
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: {
        get: () => null,
        set: () => undefined,
        delete: () => undefined,
      },
      body,
    }),
  },
}));

describe('bff testables', () => {
  const originalEnv = process.env.TENON_USE_FETCH_DISPATCHER;
  const originalMessageChannel = global.MessageChannel;
  const originalMessagePort = global.MessagePort;
  const originalReadableStream = global.ReadableStream;
  const globalAny = global as Record<string, unknown>;

  afterEach(() => {
    process.env.TENON_USE_FETCH_DISPATCHER = originalEnv;
    global.MessageChannel = originalMessageChannel;
    global.MessagePort = originalMessagePort;
    global.ReadableStream = originalReadableStream;
    jest.resetModules();
  });

  it('returns undefined when dispatcher is disabled', async () => {
    process.env.TENON_USE_FETCH_DISPATCHER = 'false';
    const mod = await import('@/lib/server/bff');
    expect(mod.__testables.getFetchDispatcher()).toBeUndefined();
  });

  it('returns undefined when required globals are missing', async () => {
    process.env.TENON_USE_FETCH_DISPATCHER = 'true';
    globalAny.MessageChannel = undefined;
    const mod = await import('@/lib/server/bff');
    expect(mod.__testables.getFetchDispatcher()).toBeUndefined();
  });

  it('creates a shared dispatcher when enabled and globals exist', async () => {
    process.env.TENON_USE_FETCH_DISPATCHER = 'true';
    globalAny.MessageChannel = MessageChannel;
    globalAny.MessagePort = MessagePort;
    globalAny.ReadableStream = ReadableStream;

    const mod = await import('@/lib/server/bff');
    const dispatcher = mod.__testables.getFetchDispatcher();
    const dispatcherAgain = mod.__testables.getFetchDispatcher();
    expect(dispatcher).toBeDefined();
    expect(dispatcherAgain).toBe(dispatcher);
  });

  it('parses retry-after values with caps', async () => {
    const { __testables } = await import('@/lib/server/bff');
    const now = Date.now();
    expect(__testables.parseRetryAfterMs('5', now, 3000)).toBe(3000);
    const future = new Date(now + 1500).toUTCString();
    const parsed = __testables.parseRetryAfterMs(future, now, 5000);
    expect(parsed).toBeGreaterThan(0);
    expect(parsed).toBeLessThanOrEqual(5000);
    expect(__testables.parseRetryAfterMs('bad', now, 2000)).toBeNull();
  });

  it('uses global crypto randomUUID when available', async () => {
    const originalCrypto = globalAny.crypto;
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: () => 'uuid-1' },
      configurable: true,
    });

    const { generateRequestId } = await import('@/lib/server/bff');
    expect(generateRequestId()).toBe('uuid-1');

    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      configurable: true,
    });
  });

  it('generates request ids from headers or fallback', async () => {
    const { readRequestId, resolveRequestId, REQUEST_ID_HEADER } =
      await import('@/lib/server/bff');

    const headers = {
      get: (key: string) => (key === REQUEST_ID_HEADER ? 'req-123' : null),
    } as Headers;

    expect(readRequestId(headers)).toBe('req-123');
    expect(readRequestId(undefined)).toBeNull();
    expect(resolveRequestId(headers, 'fallback')).toBe('req-123');
    expect(resolveRequestId(undefined, 'fallback')).toBe('fallback');
  });

  it('waits with abort handling', async () => {
    const { __testables } = await import('@/lib/server/bff');
    const controller = new AbortController();
    controller.abort();

    await expect(
      __testables.waitWithAbort(10, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    const controller2 = new AbortController();
    const promise = __testables.waitWithAbort(50, controller2.signal);
    controller2.abort(new DOMException('Aborted', 'AbortError'));
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('jitteredBackoffMs honors cap', async () => {
    const { __testables } = await import('@/lib/server/bff');
    const originalRandom = Math.random;
    Math.random = () => 0;
    const delay = __testables.jitteredBackoffMs(3, 100, 150);
    Math.random = originalRandom;

    expect(delay).toBeLessThanOrEqual(150);
  });
});
