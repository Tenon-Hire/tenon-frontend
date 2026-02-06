import { NextRequest, NextResponse } from 'next/server';
import { REQUEST_ID_HEADER, UPSTREAM_HEADER } from '@/lib/server/bff';
import { MAX_PROXY_BODY_BYTES } from './constants';

export async function readBodyTextWithLimit(
  req: NextRequest,
  requestId: string,
) {
  const limit = MAX_PROXY_BODY_BYTES;
  const declaredLength = req.headers.get('content-length');
  if (declaredLength) {
    const numeric = Number(declaredLength);
    if (!Number.isNaN(numeric) && numeric > limit) return tooLarge(requestId);
  }

  try {
    const body = await req.text();
    const byteLength =
      typeof Buffer !== 'undefined' ? Buffer.byteLength(body) : body.length;
    if (byteLength > limit) return tooLarge(requestId);
    return { body: body.length > 0 ? body : undefined };
  } catch {
    return invalid(requestId);
  }
}

function invalid(requestId: string) {
  return {
    response: NextResponse.json(
      { message: 'Invalid request body' },
      {
        status: 400,
        headers: { [REQUEST_ID_HEADER]: requestId, [UPSTREAM_HEADER]: '400' },
      },
    ),
  } as const;
}

function tooLarge(requestId: string) {
  return {
    response: NextResponse.json(
      { message: 'Payload too large' },
      {
        status: 413,
        headers: { [REQUEST_ID_HEADER]: requestId, [UPSTREAM_HEADER]: '413' },
      },
    ),
  } as const;
}
