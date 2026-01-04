import { NextRequest, NextResponse } from 'next/server';
import { ensureAccessToken } from '@/lib/server/bff';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await ensureAccessToken(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ accessToken: auth.accessToken });
}
