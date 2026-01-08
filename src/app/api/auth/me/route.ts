import { NextRequest } from 'next/server';
import { forwardJson } from '@/lib/server/bff';
import { BFF_HEADER, errorResponse } from '@/app/api/utils';
import { mergeResponseCookies, requireBffAuth } from '@/lib/server/bffAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireBffAuth(req, {
      requirePermission: 'recruiter:access',
    });

    if (!auth.ok) {
      mergeResponseCookies(auth.cookies, auth.response);
      return auth.response;
    }

    const resp = await forwardJson({
      path: '/api/auth/me',
      accessToken: auth.accessToken,
    });
    mergeResponseCookies(auth.cookies, resp);
    resp.headers.set(BFF_HEADER, 'auth-me');
    return resp;
  } catch (e: unknown) {
    return errorResponse(e);
  }
}
