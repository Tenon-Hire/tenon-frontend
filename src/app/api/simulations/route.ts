import { errorResponse, BFF_HEADER } from '@/app/api/utils';
import { forwardJson, withAuthGuard } from '@/lib/server/bff';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const resp = await withAuthGuard(
      (accessToken) =>
        forwardJson({
          path: '/api/simulations',
          accessToken,
        }),
      { requirePermission: 'recruiter:access' },
    );
    if ('set' in resp.headers) {
      resp.headers.set(BFF_HEADER, 'simulations-list');
    }
    return resp;
  } catch (e: unknown) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;

    const resp = await withAuthGuard(
      (accessToken) =>
        forwardJson({
          path: '/api/simulations',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          accessToken,
        }),
      { requirePermission: 'recruiter:access' },
    );
    if ('set' in resp.headers) {
      resp.headers.set(BFF_HEADER, 'simulations-create');
    }
    return resp;
  } catch (e: unknown) {
    return errorResponse(e);
  }
}
