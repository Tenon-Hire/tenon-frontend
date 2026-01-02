import { forwardJson, withAuthGuard } from '@/lib/server/bff';
import { BFF_HEADER } from '@/app/api/utils';

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
  resp.headers.set(BFF_HEADER, 'simulations-candidates');
  return resp;
}
