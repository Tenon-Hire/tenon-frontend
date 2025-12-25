import { NextRequest } from 'next/server';
import { forwardJson, withAuthGuard } from '@/lib/server/bff';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const payload: unknown = await req.json().catch(() => undefined);

  const resp = await withAuthGuard((accessToken) =>
    forwardJson({
      path: `/api/simulations/${encodeURIComponent(id)}/invite`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload ?? {},
      accessToken,
    }),
  );
  resp.headers.set('x-simuhire-bff', 'invite');
  return resp;
}
