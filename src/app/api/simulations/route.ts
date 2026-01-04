import { forwardWithAuth, errorResponse } from '@/app/api/utils';

export async function GET() {
  try {
    return await forwardWithAuth({
      path: '/api/simulations',
      tag: 'simulations-list',
    });
  } catch (e: unknown) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;

    return await forwardWithAuth({
      path: '/api/simulations',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      tag: 'simulations-create',
    });
  } catch (e: unknown) {
    return errorResponse(e);
  }
}
