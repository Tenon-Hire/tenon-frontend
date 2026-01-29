class MockHeaders {
  private store = new Map<string, string>();

  constructor(init?: Record<string, string>) {
    Object.entries(init ?? {}).forEach(([k, v]) =>
      this.store.set(k.toLowerCase(), String(v)),
    );
  }

  get(key: string) {
    return this.store.get(key.toLowerCase()) ?? null;
  }

  set(key: string, value: string) {
    this.store.set(key.toLowerCase(), String(value));
  }

  delete(key: string) {
    this.store.delete(key.toLowerCase());
  }

  forEach(fn: (value: string, key: string) => void) {
    this.store.forEach((value, key) => fn(value, key));
  }
}

export class MockNextResponse {
  status: number;
  headers: MockHeaders;
  body: unknown;

  constructor(
    body?: unknown,
    init?: { status?: number; headers?: Record<string, string> },
  ) {
    this.body = body;
    this.status = init?.status ?? 200;
    this.headers = new MockHeaders(init?.headers);
  }

  static json(
    body: unknown,
    init?: { status?: number; headers?: Record<string, string> },
  ) {
    return new MockNextResponse(body, {
      status: init?.status ?? 200,
      headers: init?.headers,
    });
  }
}

export class MockNextRequest {
  url: string;
  nextUrl: URL;
  method: string;
  headers: MockHeaders;
  signal: AbortSignal;
  private bodyText?: string;
  private failOnRead: boolean;

  constructor(
    url: string,
    init?: {
      method?: string;
      headers?: Record<string, string>;
      bodyText?: string;
      failOnRead?: boolean;
    },
  ) {
    this.url = url;
    this.nextUrl = new URL(url);
    this.method = init?.method ?? 'GET';
    this.headers = new MockHeaders(init?.headers);
    // Minimal AbortSignal stub used only for shape checking
    // @ts-expect-error partial signal implementation
    this.signal = { aborted: false };
    this.bodyText = init?.bodyText ?? '';
    this.failOnRead = init?.failOnRead ?? false;
  }

  async text() {
    if (this.failOnRead) {
      throw new Error('read error');
    }
    return this.bodyText ?? '';
  }

  async json() {
    const raw = await this.text();
    return JSON.parse(raw || '{}');
  }
}

export { MockHeaders };

export function makeResponse(
  body: string | null,
  init: { status: number; headers?: Record<string, string> },
) {
  const headers = new MockHeaders(init.headers);
  const encoder = new TextEncoder();
  const payload = body !== null ? encoder.encode(body) : null;
  const reader = (() => {
    let done = false;
    return {
      async read() {
        if (done || !payload) return { done: true, value: undefined };
        done = true;
        return { done: false, value: payload };
      },
      async cancel() {
        done = true;
      },
    };
  })();

  return {
    status: init.status,
    ok: init.status >= 200 && init.status < 300,
    headers,
    body: payload ? { getReader: () => reader } : null,
    arrayBuffer: async () => payload?.buffer ?? new ArrayBuffer(0),
  } as unknown as Response;
}
import { TextEncoder } from 'util';
