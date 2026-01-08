import { NextRequest, NextResponse } from 'next/server';
import {
  REQUEST_ID_HEADER,
  forwardJson,
  resolveRequestId,
} from '@/lib/server/bff';
import { BRAND_SLUG } from '@/lib/brand';
import { mergeResponseCookies, requireBffAuth } from '@/lib/server/bffAuth';

export const BFF_HEADER = `x-${BRAND_SLUG}-bff`;

type ForwardArgs = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;
  tag?: string;
  requirePermission?: string;
};

export async function forwardWithAuth(
  { tag, requirePermission, ...args }: ForwardArgs,
  req: NextRequest,
): Promise<NextResponse> {
  const auth = await requireBffAuth(req, {
    requirePermission: requirePermission,
  });
  const requestId = resolveRequestId(req.headers);
  if (!auth.ok) {
    const resp = auth.response;
    mergeResponseCookies(auth.cookies, resp);
    resp.headers.set(REQUEST_ID_HEADER, requestId);
    return resp;
  }

  let resp: NextResponse;
  try {
    resp = await forwardJson({
      ...args,
      accessToken: auth.accessToken,
      cache: args.cache ?? 'no-store',
      requestId,
    });
  } catch (e: unknown) {
    const error = errorResponse(e, 'Upstream error', requestId);
    mergeResponseCookies(auth.cookies, error);
    return error;
  }

  mergeResponseCookies(auth.cookies, resp);
  resp.headers.set(REQUEST_ID_HEADER, requestId);

  if (tag) {
    resp.headers.set(BFF_HEADER, tag);
  }

  return resp;
}

export function errorResponse(
  e: unknown,
  fallback = 'Upstream error',
  requestId?: string,
) {
  const message = e instanceof Error ? `${fallback}: ${e.message}` : fallback;
  const resp = NextResponse.json({ message }, { status: 500 });
  if (requestId) {
    resp.headers.set(REQUEST_ID_HEADER, requestId);
  }
  return resp;
}

type RecruiterAuthHandler = (auth: {
  accessToken: string;
  cookies: NextResponse;
  requestId: string;
}) => Promise<NextResponse>;

export async function withRecruiterAuth(
  req: NextRequest,
  options: { tag: string; requirePermission?: string },
  handler: RecruiterAuthHandler,
): Promise<NextResponse> {
  const requestId = resolveRequestId(req.headers);
  const auth = await requireBffAuth(req, {
    requirePermission: options.requirePermission ?? 'recruiter:access',
  });

  if (!auth.ok) {
    mergeResponseCookies(auth.cookies, auth.response);
    auth.response.headers.set(REQUEST_ID_HEADER, requestId);
    return auth.response;
  }

  try {
    const resp = await handler({ ...auth, requestId });
    mergeResponseCookies(auth.cookies, resp);
    resp.headers.set(BFF_HEADER, options.tag);
    resp.headers.set(REQUEST_ID_HEADER, requestId);
    return resp;
  } catch (e: unknown) {
    const error = errorResponse(e, 'Upstream error', requestId);
    mergeResponseCookies(auth.cookies, error);
    error.headers.set(BFF_HEADER, options.tag);
    error.headers.set(REQUEST_ID_HEADER, requestId);
    return error;
  }
}
