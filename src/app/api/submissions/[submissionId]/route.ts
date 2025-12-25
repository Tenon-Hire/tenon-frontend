import { NextRequest } from 'next/server';
import { forwardJson, withAuthGuard } from '@/lib/server/bff';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await context.params;

  const resp = await withAuthGuard((accessToken) =>
    forwardJson({
      path: `/api/submissions/${encodeURIComponent(submissionId)}`,
      accessToken,
    }),
  );
  resp.headers.set('x-simuhire-bff', 'submission-detail');
  return resp;
}
