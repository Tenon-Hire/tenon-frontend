import { forwardJson, withAuthGuard } from '@/lib/server/bff';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const resp = await withAuthGuard((accessToken) =>
    forwardJson({
      path: `/api/simulations/${encodeURIComponent(id)}/candidates`,
      accessToken,
    }),
  );
  resp.headers.set('x-simuhire-bff', 'simulations-candidates');
  return resp;
}
