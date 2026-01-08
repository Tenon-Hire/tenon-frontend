import { NextRequest, NextResponse } from 'next/server';
import { mergeResponseCookies, requireBffAuth } from '@/lib/server/bffAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const auth = await requireBffAuth(req);
  if (!auth.ok) {
    mergeResponseCookies(auth.cookies, auth.response);
    return auth.response;
  }
  const resp = NextResponse.json({ accessToken: auth.accessToken });
  mergeResponseCookies(auth.cookies, resp);
  return resp;
}
