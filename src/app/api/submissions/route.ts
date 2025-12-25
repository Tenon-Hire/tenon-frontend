import { NextRequest, NextResponse } from 'next/server';
import { forwardJson, withAuthGuard } from '@/lib/server/bff';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.toString();
  const path = `/api/submissions${search ? `?${search}` : ''}`;

  const resp = await withAuthGuard((accessToken) =>
    forwardJson({
      path,
      accessToken,
    }),
  );
  if (resp instanceof NextResponse) {
    resp.headers.set('x-simuhire-bff', 'submissions-list');
  }
  return resp;
}
