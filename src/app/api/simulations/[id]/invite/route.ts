import { NextRequest } from 'next/server';
import { forwardJson, withAuthGuard } from '@/lib/server/bff';
import { BFF_HEADER } from '@/app/api/utils';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const payload: unknown = await req.json().catch(() => undefined);

  const resp = await withAuthGuard(
    (accessToken) =>
      forwardJson({
        path: `/api/simulations/${encodeURIComponent(id)}/invite`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload ?? {},
        accessToken,
      }),
    { requirePermission: 'recruiter:access' },
  );
  resp.headers.set(BFF_HEADER, 'invite');
  return resp;
}
