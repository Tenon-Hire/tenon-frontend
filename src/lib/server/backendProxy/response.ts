import { NextResponse } from 'next/server';
import {
  REQUEST_ID_HEADER,
  UPSTREAM_HEADER,
  parseUpstreamBody,
} from '@/lib/server/bff';
import { MAX_PROXY_RESPONSE_BYTES } from './constants';
import { readStreamWithLimit } from './stream';

function tooLarge(status: number, requestId: string) {
  const resp = NextResponse.json(
    { message: 'Upstream response too large' },
    {
      status: 502,
      headers: {
        [UPSTREAM_HEADER]: String(status),
        [REQUEST_ID_HEADER]: requestId,
      },
    },
  );
  resp.headers.delete('location');
  return resp;
}

export async function buildProxyResponse(
  upstream: Response,
  upstreamHeaders: Headers,
  requestId: string,
) {
  const upstreamStatus = upstream.status;
  const blockedRedirect = upstreamStatus >= 300 && upstreamStatus < 400;
  if (blockedRedirect) {
    return NextResponse.json(
      { message: 'Upstream redirect blocked', upstreamStatus },
      { status: 502, headers: { [UPSTREAM_HEADER]: String(upstreamStatus) } },
    );
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  const responseContentLength = upstream.headers.get('content-length');
  if (
    responseContentLength &&
    Number(responseContentLength) > MAX_PROXY_RESPONSE_BYTES
  ) {
    return tooLarge(upstreamStatus, requestId);
  }

  if (contentType.includes('application/json')) {
    const limited = await readStreamWithLimit(
      upstream,
      MAX_PROXY_RESPONSE_BYTES,
    );
    if (limited.exceeded) return tooLarge(upstreamStatus, requestId);
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
    return NextResponse.json(parsed ?? null, {
      status: upstreamStatus,
      headers: {
        [UPSTREAM_HEADER]: String(upstreamStatus),
        [REQUEST_ID_HEADER]: requestId,
      },
    });
  }

  const limited = await readStreamWithLimit(upstream, MAX_PROXY_RESPONSE_BYTES);
  if (limited.exceeded) return tooLarge(upstreamStatus, requestId);

  let bodyBuffer = limited.buffer ?? null;
  if (!bodyBuffer) {
    try {
      const fallbackBuffer = await upstream.arrayBuffer();
      if (fallbackBuffer.byteLength > MAX_PROXY_RESPONSE_BYTES)
        return tooLarge(upstreamStatus, requestId);
      bodyBuffer = fallbackBuffer;
    } catch {
      bodyBuffer = null;
    }
  }

  return new NextResponse(bodyBuffer ?? undefined, {
    status: upstreamStatus,
    headers: upstreamHeaders,
  });
}
