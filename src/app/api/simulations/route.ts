import { NextRequest } from 'next/server';
import { forwardWithAuth, errorResponse } from '@/app/api/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    return await forwardWithAuth({
      path: '/api/simulations',
      tag: 'simulations-list',
      request: req,
    });
  } catch (e: unknown) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;

    return await forwardWithAuth({
      path: '/api/simulations',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      tag: 'simulations-create',
      request: req,
    });
  } catch (e: unknown) {
    return errorResponse(e);
  }
}
