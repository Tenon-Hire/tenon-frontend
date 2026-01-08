import { NextRequest } from 'next/server';
import { forwardJson } from '@/lib/server/bff';
import { withRecruiterAuth } from '@/app/api/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; candidateSessionId: string }> },
) {
  const { id, candidateSessionId } = await context.params;
  return withRecruiterAuth(
    req,
    { tag: 'invite-resend', requirePermission: 'recruiter:access' },
    async (auth) =>
      forwardJson({
        path: `/api/simulations/${encodeURIComponent(id)}/candidates/${encodeURIComponent(candidateSessionId)}/invite/resend`,
        method: 'POST',
        cache: 'no-store',
        accessToken: auth.accessToken,
        requestId: auth.requestId,
      }),
  );
}
