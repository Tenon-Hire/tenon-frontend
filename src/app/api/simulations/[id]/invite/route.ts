import { NextRequest } from 'next/server';
import { forwardJson } from '@/lib/server/bff';
import { withRecruiterAuth } from '@/app/api/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const payload: unknown = await req.json().catch(() => undefined);

  return withRecruiterAuth(
    req,
    { tag: 'invite', requirePermission: 'recruiter:access' },
    async (auth) =>
      forwardJson({
        path: `/api/simulations/${encodeURIComponent(id)}/invite`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload ?? {},
        accessToken: auth.accessToken,
        requestId: auth.requestId,
      }),
  );
}
