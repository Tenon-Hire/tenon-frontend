import { NextResponse } from 'next/server';
import { DEBUG_PERF, REQUEST_ID_HEADER, UPSTREAM_HEADER } from './constants';
import { getBackendBaseUrl } from './upstream';
import { parseUpstreamBody } from './upstream';
import { generateRequestId } from './requestId';
import { upstreamRequest } from './upstreamRequest';

export type ForwardOptions = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  accessToken: string;
  cache?: RequestCache;
  timeoutMs?: number;
  requestId?: string;
  maxTotalTimeMs?: number;
};

export async function forwardJson(options: ForwardOptions) {
  const { path, method = 'GET', headers = {}, body, accessToken } = options;
  const backendBase = getBackendBaseUrl();
  const start = DEBUG_PERF ? Date.now() : null;
  const requestId = options.requestId ?? generateRequestId();
  const methodUpper = method.toUpperCase();

  const outgoingHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...headers,
  };

  const hasBody =
    body !== undefined && methodUpper !== 'GET' && methodUpper !== 'HEAD';
  const serializedBody =
    body === undefined
      ? undefined
      : typeof body === 'string'
        ? body
        : JSON.stringify(body);

  const callerSetContentType = Object.keys(outgoingHeaders).some(
    (h) => h.toLowerCase() === 'content-type',
  );
  if (hasBody && !callerSetContentType && typeof body !== 'string') {
    outgoingHeaders['Content-Type'] = 'application/json';
  }

  try {
    const upstream = await upstreamRequest({
      url: `${backendBase}${path}`,
      method,
      headers: outgoingHeaders,
      body: serializedBody,
      cache: options.cache ?? 'no-store',
      timeoutMs: options.timeoutMs ?? 15000,
      maxTotalTimeMs: options.maxTotalTimeMs,
      requestId,
    });

    if (DEBUG_PERF && start !== null) {
      // eslint-disable-next-line no-console
      console.log(
        `[perf:bff] [req ${requestId}] ${method} ${path} -> ${upstream.status} ${Date.now() - start}ms`,
      );
    }

    const parsed = await parseUpstreamBody(upstream);
    const response = NextResponse.json(parsed, {
      status: upstream.status,
      headers: {
        [UPSTREAM_HEADER]: String(upstream.status),
        [REQUEST_ID_HEADER]: requestId,
      },
    });
    const meta = (upstream as unknown as { _tenonMeta?: unknown })
      ._tenonMeta as { attempts?: number; durationMs?: number } | undefined;
    if (meta) {
      const retryCount = Math.max(0, (meta.attempts ?? 1) - 1);
      response.headers.set(
        'Server-Timing',
        `bff;dur=${meta.durationMs ?? 0}, retry;desc="count=${retryCount}"`,
      );
    }
    response.headers.delete('location');
    return response;
  } catch (e) {
    if (DEBUG_PERF && start !== null) {
      // eslint-disable-next-line no-console
      console.log(
        `[perf:bff] [req ${requestId}] ${method} ${path} -> error ${Date.now() - start}ms`,
      );
    }
    throw e;
  }
}
