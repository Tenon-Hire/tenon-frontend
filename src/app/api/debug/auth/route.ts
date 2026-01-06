import { NextResponse } from 'next/server';
import { getSessionNormalized } from '@/lib/auth0';
import { extractPermissions } from '@/lib/auth0-claims';
import { CUSTOM_CLAIM_ROLES } from '@/lib/brand';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const session = await getSessionNormalized();
  if (!session) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const user = session.user ?? {};
  const permissionList = extractPermissions(
    user,
    (session as { accessToken?: string | null }).accessToken ?? null,
  );

  return NextResponse.json({
    userKeys: Object.keys(user),
    permissions: permissionList,
    roles: user[CUSTOM_CLAIM_ROLES] ?? user.roles ?? [],
  });
}
