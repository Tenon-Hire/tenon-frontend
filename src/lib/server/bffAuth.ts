import { NextRequest, NextResponse } from 'next/server';
import { auth0, getSessionNormalized } from '@/lib/auth0';
import { extractPermissions, hasPermission } from '@/lib/auth0-claims';

type AuthResultSuccess = {
  ok: true;
  accessToken: string;
  permissions: string[];
  session: Awaited<ReturnType<typeof getSessionNormalized>>;
  cookies: NextResponse;
};

type AuthResultFailure = {
  ok: false;
  response: NextResponse;
  cookies: NextResponse;
};

type AuthResult = AuthResultSuccess | AuthResultFailure;

function normalizeAccessToken(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const maybe =
      (raw as { token?: unknown }).token ??
      (raw as { accessToken?: unknown }).accessToken;
    return typeof maybe === 'string' ? maybe : null;
  }
  return null;
}

export function mergeResponseCookies(
  from: NextResponse | null | undefined,
  into: NextResponse,
) {
  if (!from) return;
  from.cookies.getAll().forEach((cookie) => {
    into.cookies.set(cookie);
  });
}

export async function requireBffAuth(
  req: NextRequest,
  options?: { requirePermission?: string },
): Promise<AuthResult> {
  const cookieCarrier = NextResponse.next();
  const start = process.env.TENON_DEBUG_PERF ? Date.now() : null;
  const logPerf = (status: string) => {
    if (start !== null) {
      // eslint-disable-next-line no-console
      console.log(
        `[perf:bff-auth] permission=${options?.requirePermission ?? 'any'} status=${status} ${Date.now() - start}ms`,
      );
    }
  };

  const session = await getSessionNormalized(req);
  if (!session) {
    logPerf('unauthenticated');
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 },
      ),
      cookies: cookieCarrier,
    };
  }

  const permissions = extractPermissions(
    session.user,
    normalizeAccessToken((session as { accessToken?: unknown }).accessToken),
  );
  if (
    options?.requirePermission &&
    !hasPermission(permissions, options.requirePermission)
  ) {
    logPerf('forbidden');
    return {
      ok: false,
      response: NextResponse.json({ message: 'Forbidden' }, { status: 403 }),
      cookies: cookieCarrier,
    };
  }

  try {
    const tokenResult = await auth0.getAccessToken(req, cookieCarrier, {
      refresh: true,
    });
    const accessToken = normalizeAccessToken(tokenResult);
    if (!accessToken) {
      logPerf('missing-token');
      return {
        ok: false,
        response: NextResponse.json(
          { message: 'Not authenticated' },
          { status: 401 },
        ),
        cookies: cookieCarrier,
      };
    }

    const result: AuthResultSuccess = {
      ok: true,
      accessToken,
      permissions,
      session,
      cookies: cookieCarrier,
    };
    logPerf('ok');
    return result;
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Unable to obtain access token';
    logPerf('token-error');
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Not authenticated', detail: message },
        { status: 401 },
      ),
      cookies: cookieCarrier,
    };
  }
}
