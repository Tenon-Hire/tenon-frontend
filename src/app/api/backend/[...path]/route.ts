import { NextRequest, NextResponse } from 'next/server';
import {
  REQUEST_ID_HEADER,
  UPSTREAM_HEADER,
  getBackendBaseUrl,
  parseUpstreamBody,
  resolveRequestId,
  upstreamRequest,
} from '@/lib/server/bff';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type BackendRouteContext = { params: Promise<{ path: string[] }> };

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'host',
  'content-length',
  'accept-encoding',
  'upgrade',
  'keep-alive',
  'transfer-encoding',
  'cookie',
]);

const MAX_PROXY_BODY_BYTES = Number(
  process.env.TENON_PROXY_MAX_BODY_BYTES ?? 2 * 1024 * 1024,
);
const PROXY_TIMEOUT_MS = 20000;
const MAX_PROXY_RESPONSE_BYTES = Number(
  process.env.TENON_PROXY_MAX_RESPONSE_BYTES ?? 2 * 1024 * 1024,
);

async function readBodyWithLimit(
  req: NextRequest,
  limit: number,
): Promise<{ body?: ArrayBuffer; tooLarge?: boolean; invalid?: boolean }> {
  const declaredLength = req.headers.get('content-length');
  if (declaredLength) {
    const numeric = Number(declaredLength);
    if (!Number.isNaN(numeric) && numeric > limit) return { tooLarge: true };
  }

  try {
    const body = await req.arrayBuffer();
    if (body.byteLength > limit) return { tooLarge: true };
    return { body };
  } catch {
    return { invalid: true };
  }
}

async function readStreamWithLimit(
  res: Response,
  limit: number,
): Promise<{ buffer?: ArrayBuffer; exceeded: boolean }> {
  if (!res.body) return { exceeded: false, buffer: undefined };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > limit) {
        if (typeof res.body.cancel === 'function') {
          await res.body.cancel().catch(() => undefined);
        }
        return { exceeded: true };
      }
      chunks.push(value);
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return { buffer: merged.buffer, exceeded: false };
}

async function proxyToBackend(req: NextRequest, context: BackendRouteContext) {
  const start = process.env.TENON_DEBUG_PERF ? Date.now() : null;
  const requestId = resolveRequestId(req.headers);
  const params = await context.params;
  const rawPath = params?.path;
  const pathSegments = Array.isArray(rawPath)
    ? rawPath
    : typeof rawPath === 'string'
      ? [rawPath]
      : [];
  const encodedPath =
    pathSegments.length > 0
      ? pathSegments.map(encodeURIComponent).join('/')
      : '';

  const search = req.nextUrl.search ?? '';
  const backendPath = `/api/${encodedPath}${search}`;
  const targetUrl = `${getBackendBaseUrl()}${backendPath}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  try {
    let body: ArrayBuffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const limited = await readBodyWithLimit(req, MAX_PROXY_BODY_BYTES);
      if (limited.invalid) {
        const resp = NextResponse.json(
          { message: 'Invalid request body' },
          {
            status: 400,
            headers: {
              [REQUEST_ID_HEADER]: requestId,
              [UPSTREAM_HEADER]: '400',
            },
          },
        );
        return resp;
      }
      if (limited.tooLarge) {
        const resp = NextResponse.json(
          { message: 'Payload too large' },
          {
            status: 413,
            headers: {
              [REQUEST_ID_HEADER]: requestId,
              [UPSTREAM_HEADER]: '413',
            },
          },
        );
        return resp;
      }
      body = limited.body;
    }

    const upstream = await upstreamRequest({
      url: targetUrl,
      method: req.method,
      headers,
      body,
      cache: 'no-store',
      timeoutMs: PROXY_TIMEOUT_MS,
      requestId,
      signal: req.signal,
      maxTotalTimeMs: PROXY_TIMEOUT_MS,
    });
    const upstreamStatus = upstream.status;
    const blockedRedirect = upstreamStatus >= 300 && upstreamStatus < 400;

    const upstreamHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!HOP_BY_HOP_HEADERS.has(lower) && lower !== 'location') {
        upstreamHeaders.set(key, value);
      }
    });
    upstreamHeaders.set(UPSTREAM_HEADER, String(upstreamStatus));
    upstreamHeaders.set(REQUEST_ID_HEADER, requestId);

    let response: NextResponse;

    if (blockedRedirect) {
      response = NextResponse.json(
        { message: 'Upstream redirect blocked', upstreamStatus },
        { status: 502, headers: { [UPSTREAM_HEADER]: String(upstreamStatus) } },
      );
    } else {
      const contentType = upstream.headers.get('content-type') ?? '';
      const responseContentLength = upstream.headers.get('content-length');
      if (
        responseContentLength &&
        Number(responseContentLength) > MAX_PROXY_RESPONSE_BYTES
      ) {
        const tooLarge = NextResponse.json(
          { message: 'Upstream response too large' },
          {
            status: 502,
            headers: {
              [UPSTREAM_HEADER]: String(upstreamStatus),
              [REQUEST_ID_HEADER]: requestId,
            },
          },
        );
        tooLarge.headers.delete('location');
        return tooLarge;
      }

      if (contentType.includes('application/json')) {
        const limited = await readStreamWithLimit(
          upstream,
          MAX_PROXY_RESPONSE_BYTES,
        );
        if (limited.exceeded) {
          const tooLarge = NextResponse.json(
            { message: 'Upstream response too large' },
            {
              status: 502,
              headers: {
                [UPSTREAM_HEADER]: String(upstreamStatus),
                [REQUEST_ID_HEADER]: requestId,
              },
            },
          );
          tooLarge.headers.delete('location');
          return tooLarge;
        }
        let parsed: unknown = null;
        if (limited.buffer) {
          try {
            const text = new TextDecoder().decode(limited.buffer);
            parsed = text ? JSON.parse(text) : null;
          } catch {
            parsed = { message: 'Invalid JSON from upstream' };
          }
        } else {
          parsed = await parseUpstreamBody(upstream);
        }
        response = NextResponse.json(parsed ?? null, {
          status: upstreamStatus,
          headers: {
            [UPSTREAM_HEADER]: String(upstreamStatus),
            [REQUEST_ID_HEADER]: requestId,
          },
        });
      } else {
        const limited = await readStreamWithLimit(
          upstream,
          MAX_PROXY_RESPONSE_BYTES,
        );
        if (limited.exceeded) {
          const tooLarge = NextResponse.json(
            { message: 'Upstream response too large' },
            {
              status: 502,
              headers: {
                [UPSTREAM_HEADER]: String(upstreamStatus),
                [REQUEST_ID_HEADER]: requestId,
              },
            },
          );
          tooLarge.headers.delete('location');
          return tooLarge;
        }
        let bodyBuffer = limited.buffer ?? null;
        if (!bodyBuffer) {
          try {
            const fallbackBuffer = await upstream.arrayBuffer();
            if (fallbackBuffer.byteLength > MAX_PROXY_RESPONSE_BYTES) {
              const tooLarge = NextResponse.json(
                { message: 'Upstream response too large' },
                {
                  status: 502,
                  headers: {
                    [UPSTREAM_HEADER]: String(upstreamStatus),
                    [REQUEST_ID_HEADER]: requestId,
                  },
                },
              );
              tooLarge.headers.delete('location');
              return tooLarge;
            }
            bodyBuffer = fallbackBuffer;
          } catch {
            bodyBuffer = null;
          }
        }

        response = new NextResponse(bodyBuffer ?? undefined, {
          status: upstreamStatus,
          headers: upstreamHeaders,
        });
      }
    }

    response.headers.delete('location');
    response.headers.set(REQUEST_ID_HEADER, requestId);
    const meta = (upstream as unknown as { _tenonMeta?: unknown })
      ._tenonMeta as { attempts?: number; durationMs?: number } | undefined;
    if (meta) {
      const retryCount = Math.max(0, (meta.attempts ?? 1) - 1);
      response.headers.set(
        'Server-Timing',
        `bff;dur=${meta.durationMs ?? 0}, retry;desc="count=${retryCount}"`,
      );
    }

    if (start !== null) {
      // eslint-disable-next-line no-console
      console.log(
        `[perf:backend-proxy] [req ${requestId}] ${req.method} ${backendPath} -> ${upstreamStatus} ${Date.now() - start}ms`,
      );
    }

    return response;
  } catch (e: unknown) {
    const resp = NextResponse.json(
      {
        message: 'Upstream request failed',
        detail: e instanceof Error ? e.message : undefined,
      },
      {
        status: 502,
        headers: {
          [REQUEST_ID_HEADER]: requestId,
          [UPSTREAM_HEADER]: '502',
        },
      },
    );
    return resp;
  }
}

export function GET(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}

export function HEAD(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}

export function POST(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}

export function PUT(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}

export function PATCH(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}

export function DELETE(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}

export function OPTIONS(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}
