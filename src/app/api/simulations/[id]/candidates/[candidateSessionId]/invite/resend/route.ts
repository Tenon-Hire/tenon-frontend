import { forwardJson, withAuthGuard } from '@/lib/server/bff';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string; candidateSessionId: string }> },
) {
  const { id, candidateSessionId } = await context.params;

  return withAuthGuard(
    (accessToken) =>
      forwardJson({
        path: `/api/simulations/${encodeURIComponent(id)}/candidates/${encodeURIComponent(candidateSessionId)}/invite/resend`,
        method: 'POST',
        cache: 'no-store',
        accessToken,
      }),
    { requirePermission: 'recruiter:access' },
  );
}
