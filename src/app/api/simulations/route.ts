import { NextResponse } from 'next/server';
import { forwardJson, withAuthGuard } from '@/lib/server/bff';

export async function GET() {
  try {
    return await withAuthGuard((accessToken) =>
      forwardJson({ path: '/api/simulations', accessToken }),
    );
  } catch (e: unknown) {
    const message =
      e instanceof Error ? `Upstream error: ${e.message}` : 'Upstream error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;

    return await withAuthGuard((accessToken) =>
      forwardJson({
        path: '/api/simulations',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        accessToken,
      }),
    );
  } catch (e: unknown) {
    const message =
      e instanceof Error ? `Upstream error: ${e.message}` : 'Upstream error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
