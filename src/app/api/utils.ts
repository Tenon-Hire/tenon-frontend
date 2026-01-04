import { NextResponse, type NextRequest } from 'next/server';
import { forwardJson, withAuthGuard } from '@/lib/server/bff';
import { BRAND_SLUG } from '@/lib/brand';

export const BFF_HEADER = `x-${BRAND_SLUG}-bff`;

type ForwardArgs = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;
  tag?: string;
  request?: NextRequest;
};

export async function forwardWithAuth({
  tag,
  ...args
}: ForwardArgs): Promise<NextResponse> {
  const resp = await withAuthGuard(
    (accessToken) => forwardJson({ ...args, accessToken }),
    args.request,
  );

  if (resp instanceof NextResponse && tag) {
    resp.headers.set(BFF_HEADER, tag);
  }

  return resp;
}

export function errorResponse(e: unknown, fallback = 'Upstream error') {
  const message = e instanceof Error ? `${fallback}: ${e.message}` : fallback;
  return NextResponse.json({ message }, { status: 500 });
}
