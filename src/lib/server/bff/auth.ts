import { NextResponse } from 'next/server';
import { getAccessToken, getSessionNormalized } from '@/lib/auth0';
import { extractPermissions, hasPermission } from '@/lib/auth0-claims';

export async function ensureAccessToken(
  requiredPermission?: string,
): Promise<NextResponse | { accessToken: string }> {
  const session = await getSessionNormalized();
  if (!session) {
    if (process.env.TENON_DEBUG_AUTH) {
      // eslint-disable-next-line no-console
      console.debug('[auth] no session available');
    }
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  if (requiredPermission) {
    const permissions = extractPermissions(
      session.user,
      (session as { accessToken?: string | null }).accessToken ?? null,
    );
    if (!hasPermission(permissions, requiredPermission)) {
      if (process.env.TENON_DEBUG_AUTH) {
        // eslint-disable-next-line no-console
        console.debug('[auth] missing permission', requiredPermission, {
          perms: permissions,
        });
      }
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const accessToken = await getAccessToken();
    return { accessToken };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown token error';
    return NextResponse.json(
      { message: 'Not authenticated', details: msg },
      { status: 401 },
    );
  }
}

export async function withAuthGuard(
  handler: (accessToken: string) => Promise<NextResponse>,
  options?: { requirePermission?: string },
) {
  const auth = await ensureAccessToken(options?.requirePermission);
  if (auth instanceof NextResponse) return auth;
  return handler(auth.accessToken);
}
