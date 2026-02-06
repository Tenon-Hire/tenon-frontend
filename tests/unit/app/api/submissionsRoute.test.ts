jest.mock('next/server', () => {
  class SimpleNextRequest {
    nextUrl: URL;
    constructor(public url: string) {
      this.nextUrl = new URL(url);
    }
  }
  return {
    NextRequest: SimpleNextRequest,
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: async () => body,
        headers: {
          get: () => null,
          set: () => undefined,
          delete: () => undefined,
        },
        cookies: { set: () => undefined, getAll: () => [] },
      }),
    },
  };
});

class MockResponse {
  status: number;
  #body: string;
  headers: Map<string, string>;
  constructor(
    body: unknown,
    init?: { status?: number; headers?: Record<string, string> },
  ) {
    this.status = init?.status ?? 200;
    this.#body = typeof body === 'string' ? body : JSON.stringify(body);
    this.headers = new Map(Object.entries(init?.headers ?? {}));
  }
  async json() {
    return JSON.parse(this.#body);
  }
}

// Provide global Response for forwardBffWithAuth mock
// @ts-expect-error allow override for test
global.Response = MockResponse as unknown as typeof Response;

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/submissions/route';

jest.mock('@/app/api/bffRouteHelpers', () => ({
  __esModule: true,
  forwardBffWithAuth: jest.fn(
    async (opts) =>
      new Response(JSON.stringify({ path: opts.path, tag: opts.tag }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  ),
}));

describe('submissions route', () => {
  it('forwards search params and tag', async () => {
    const req = new NextRequest('http://localhost/api/submissions?candidate=1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      path: '/api/submissions?candidate=1',
      tag: 'submissions-list',
    });
  });
});
