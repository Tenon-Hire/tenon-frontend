import { NextResponse } from 'next/server';
import { auth0, getAccessToken } from '@/lib/auth0';

function stripTrailingApi(raw: string) {
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

export function getBackendBaseUrl(): string {
  const raw = process.env.BACKEND_BASE_URL ?? 'http://localhost:8000';
  return stripTrailingApi(raw);
}

export async function parseUpstreamBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return (await res.json()) as unknown;
    } catch {
      return undefined;
    }
  }

  try {
    return await res.text();
  } catch {
    return undefined;
  }
}

export async function ensureAccessToken(): Promise<
  NextResponse | { accessToken: string }
> {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
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

type ForwardOptions = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  accessToken: string;
  cache?: RequestCache;
};

export async function forwardJson(options: ForwardOptions) {
  const { path, method = 'GET', headers = {}, body, accessToken } = options;
  const backendBase = getBackendBaseUrl();

  const upstream = await fetch(`${backendBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : typeof body === 'string'
          ? body
          : JSON.stringify(body),
    cache: options.cache ?? 'no-store',
  });

  const parsed = await parseUpstreamBody(upstream);
  return NextResponse.json(parsed, {
    status: upstream.status,
    headers: { 'x-simuhire-upstream-status': String(upstream.status) },
  });
}

export async function withAuthGuard(
  handler: (accessToken: string) => Promise<NextResponse>,
) {
  const auth = await ensureAccessToken();
  if (auth instanceof NextResponse) return auth;
  return handler(auth.accessToken);
}
