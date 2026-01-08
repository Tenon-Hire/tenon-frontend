import { NextResponse } from 'next/server';
import {
  UPSTREAM_HEADER,
  getBackendBaseUrl,
  parseUpstreamBody,
} from '@/lib/server/bff';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const start = process.env.TENON_DEBUG_PERF ? Date.now() : null;
  try {
    const upstream = await fetch(`${getBackendBaseUrl()}/health`, {
      cache: 'no-store',
      redirect: 'manual',
    });
    const upstreamStatus = upstream.status;
    const blockedRedirect = upstreamStatus >= 300 && upstreamStatus < 400;
    const parsed = await parseUpstreamBody(upstream);

    const response = NextResponse.json(
      blockedRedirect
        ? { message: 'Upstream redirect blocked', upstreamStatus }
        : (parsed ?? { status: upstreamStatus }),
      { status: blockedRedirect ? 502 : upstreamStatus },
    );
    response.headers.set(UPSTREAM_HEADER, String(upstreamStatus));
    response.headers.delete('location');

    if (start !== null) {
      // eslint-disable-next-line no-console
      console.log(`[perf:health] -> ${upstreamStatus} ${Date.now() - start}ms`);
    }

    return response;
  } catch (e: unknown) {
    return NextResponse.json(
      {
        message: 'Health check failed',
        detail: e instanceof Error ? e.message : undefined,
      },
      { status: 503 },
    );
  }
}
