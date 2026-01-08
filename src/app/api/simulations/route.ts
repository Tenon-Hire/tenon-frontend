import { NextRequest, NextResponse } from 'next/server';
import { forwardJson } from '@/lib/server/bff';
import { withRecruiterAuth } from '@/app/api/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  return withRecruiterAuth(
    req,
    { tag: 'simulations-list', requirePermission: 'recruiter:access' },
    async (auth) =>
      forwardJson({
        path: '/api/simulations',
        accessToken: auth.accessToken,
        requestId: auth.requestId,
      }),
  );
}

export async function POST(req: NextRequest) {
  return withRecruiterAuth(
    req,
    { tag: 'simulations-create', requirePermission: 'recruiter:access' },
    async (auth) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ message: 'Bad request' }, { status: 400 });
      }

      return forwardJson({
        path: '/api/simulations',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        accessToken: auth.accessToken,
        requestId: auth.requestId,
      });
    },
  );
}
