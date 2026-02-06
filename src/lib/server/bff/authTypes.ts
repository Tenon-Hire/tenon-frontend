import { NextResponse } from 'next/server';
import { getSessionNormalized } from '@/lib/auth0';

export type AuthResult =
  | {
      ok: true;
      accessToken: string;
      permissions: string[];
      session: Awaited<ReturnType<typeof getSessionNormalized>>;
      cookies: NextResponse;
    }
  | { ok: false; response: NextResponse; cookies: NextResponse };
