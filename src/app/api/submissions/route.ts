import { NextRequest } from 'next/server';
import { forwardBffWithAuth } from '@/app/api/bffRouteHelpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.toString();
  const path = `/api/submissions${search ? `?${search}` : ''}`;

  return forwardBffWithAuth(
    {
      path,
      tag: 'submissions-list',
      requirePermission: 'recruiter:access',
    },
    req,
  );
}
