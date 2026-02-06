import { NextRequest, NextResponse } from 'next/server';
import {
  REQUEST_ID_HEADER,
  UPSTREAM_HEADER,
  resolveRequestId,
  upstreamRequest,
} from '@/lib/server/bff';
import { DEBUG_PROXY } from './constants';
import { forwardHeaders, copyUpstreamHeaders } from './headers';
import { readBodyTextWithLimit } from './body';
import { buildProxyResponse } from './response';
import { resolveTarget, type BackendRouteContext } from './target';

export async function proxyToBackend(
  req: NextRequest,
  context: BackendRouteContext,
) {
  const start = process.env.TENON_DEBUG_PERF ? Date.now() : null;
  const requestId = resolveRequestId(req.headers);
  const { backendPath, targetUrl, method, timeoutMs } = await resolveTarget(
    req,
    context,
  );
  const headers = forwardHeaders(req);

  try {
    if (DEBUG_PROXY) {
      // eslint-disable-next-line no-console
      console.log(
        `[debug:backend-proxy] [req ${requestId}] ${req.method} ${req.nextUrl.pathname}${req.nextUrl.search ?? ''} -> ${targetUrl}`,
      );
    }

    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      const limited = await readBodyTextWithLimit(req, requestId);
      if ('response' in limited) return limited.response;
      body = limited.body;
    }

    const upstream = await upstreamRequest({
      url: targetUrl,
      method,
      headers,
      body,
      cache: 'no-store',
      timeoutMs,
      requestId,
      signal: req.signal,
      maxTotalTimeMs: timeoutMs,
    });

    const upstreamHeaders = copyUpstreamHeaders(upstream, requestId);
    upstreamHeaders.set(UPSTREAM_HEADER, String(upstream.status));
    const response = await buildProxyResponse(
      upstream,
      upstreamHeaders,
      requestId,
    );
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
        `[perf:backend-proxy] [req ${requestId}] ${req.method} ${backendPath} -> ${upstream.status} ${Date.now() - start}ms`,
      );
    }

    return response;
  } catch (e: unknown) {
    return NextResponse.json(
      {
        message: 'Upstream request failed',
        detail: e instanceof Error ? e.message : undefined,
      },
      {
        status: 502,
        headers: { [REQUEST_ID_HEADER]: requestId, [UPSTREAM_HEADER]: '502' },
      },
    );
  }
}
