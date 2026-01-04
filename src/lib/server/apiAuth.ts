import { NextResponse, type NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';

type AccessTokenOptions = {
  refresh?: boolean | null;
  scope?: string | null;
  audience?: string | null;
};

function normalizeAccessToken(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const token =
      (raw as { accessToken?: unknown }).accessToken ??
      (raw as { token?: unknown }).token;
    return typeof token === 'string' ? token : null;
  }
  return null;
}

async function tryGetAccessToken(
  options?: AccessTokenOptions,
): Promise<string | null> {
  try {
    const tokenResult = await auth0.getAccessToken(options ?? {});
    return normalizeAccessToken(tokenResult);
  } catch {
    return null;
  }
}

async function fetchAuthAccessToken(request?: NextRequest) {
  if (!request) return null;

  try {
    const accessTokenUrl = new URL('/auth/access-token', request.url);
    const res = await fetch(accessTokenUrl.toString(), {
      method: 'GET',
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
      credentials: 'include',
    });

    if (!res.ok) return null;
    const body = (await res.json()) as
      | { accessToken?: unknown }
      | { token?: unknown };

    return normalizeAccessToken(
      (body as { accessToken?: unknown }).accessToken ??
        (body as { token?: unknown }).token,
    );
  } catch {
    return null;
  }
}

export async function requireApiAccessToken(
  request?: NextRequest,
): Promise<NextResponse | { accessToken: string }> {
  const accessToken =
    (await tryGetAccessToken()) ??
    (await tryGetAccessToken({ refresh: true })) ??
    (await fetchAuthAccessToken(request));

  if (!accessToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return { accessToken };
}
