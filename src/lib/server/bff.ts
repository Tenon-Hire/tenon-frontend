import { NextResponse, type NextRequest } from 'next/server';
import { requireApiAccessToken } from '@/lib/server/apiAuth';
import { BRAND_SLUG } from '@/lib/brand';

export const UPSTREAM_HEADER = `x-${BRAND_SLUG}-upstream-status`;

function stripTrailingApi(raw: string) {
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

export function getBackendBaseUrl(): string {
  const raw = process.env.TENON_BACKEND_BASE_URL ?? 'http://localhost:8000';
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

export const ensureAccessToken = requireApiAccessToken;

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
    headers: { [UPSTREAM_HEADER]: String(upstream.status) },
  });
}

export async function withAuthGuard(
  handler: (accessToken: string) => Promise<NextResponse>,
  request?: NextRequest,
) {
  const auth = await ensureAccessToken(request);
  if (auth instanceof NextResponse) return auth;
  return handler(auth.accessToken);
}
