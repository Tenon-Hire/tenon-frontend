import { NextRequest } from 'next/server';
import { forwardJson } from '@/lib/server/bff';
import { withRecruiterAuth } from '@/app/api/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  return withRecruiterAuth(
    req,
    { tag: 'auth-me', requirePermission: 'recruiter:access' },
    async (auth) =>
      forwardJson({
        path: '/api/auth/me',
        accessToken: auth.accessToken,
        requestId: auth.requestId,
      }),
  );
}
