import { NextResponse } from 'next/server';
import { REQUEST_ID_HEADER } from '@/lib/server/bff';

export function errorResponse(
  e: unknown,
  fallback = 'Upstream error',
  requestId?: string,
) {
  const message = e instanceof Error ? `${fallback}: ${e.message}` : fallback;
  const resp = NextResponse.json({ message }, { status: 500 });
  if (requestId) resp.headers.set(REQUEST_ID_HEADER, requestId);
  return resp;
}
