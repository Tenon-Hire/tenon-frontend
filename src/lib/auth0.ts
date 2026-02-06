import { type NextRequest, NextResponse } from 'next/server';
import { cache } from 'react';
import { normalizeUserClaims } from '@/lib/auth0-claims';
import { auth0Available, createAuth0Client } from './auth0/client';

export const auth0 = auth0Available
  ? createAuth0Client()
  : {
      middleware: async (_req?: NextRequest) => NextResponse.next(),
      getSession: async (_req?: NextRequest) => null,
      getAccessToken: async (
        _req?: NextRequest,
        _res?: NextResponse,
        _opts?: unknown,
      ) => {
        throw new Error(
          'Auth0 env vars are missing. Access token is unavailable in this environment.',
        );
      },
    };

export const getAccessToken = async () => {
  const tokenResult = await auth0.getAccessToken();

  if (!tokenResult?.token) {
    throw new Error('No access token found in Auth0 session');
  }

  return tokenResult.token;
};

export const getSessionNormalized = async (
  request?: NextRequest,
): Promise<
  | (Awaited<ReturnType<typeof auth0.getSession>> & {
      user?: Record<string, unknown>;
    })
  | null
> => {
  const start = process.env.TENON_DEBUG_PERF ? Date.now() : null;
  const session = request
    ? await auth0.getSession(request)
    : await auth0.getSession();
  if (!session?.user) return session;
  const normalized = {
    ...session,
    user: normalizeUserClaims(
      session.user as Record<string, unknown>,
    ) as typeof session.user,
  };
  if (start !== null) {
    // eslint-disable-next-line no-console
    console.log(`[perf:session] session normalized in ${Date.now() - start}ms`);
  }
  return normalized;
};

export const getCachedSessionNormalized = cache(async () =>
  getSessionNormalized(),
);
