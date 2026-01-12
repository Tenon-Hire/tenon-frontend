import { Buffer } from 'buffer';
import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextResponse, type NextRequest } from 'next/server';
import { cache } from 'react';
import { normalizeUserClaims } from '@/lib/auth0-claims';
import { modeForPath, sanitizeReturnTo } from '@/lib/auth/routing';
import {
  CUSTOM_CLAIM_PERMISSIONS,
  CUSTOM_CLAIM_PERMISSIONS_STR,
  CUSTOM_CLAIM_ROLES,
} from '@/lib/brand';

function hasAuth0Env() {
  return Boolean(
    process.env.TENON_AUTH0_SECRET &&
    process.env.TENON_AUTH0_DOMAIN &&
    process.env.TENON_AUTH0_CLIENT_ID &&
    process.env.TENON_AUTH0_CLIENT_SECRET &&
    process.env.TENON_APP_BASE_URL,
  );
}

function createClient() {
  const toStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? (value.filter((v) => typeof v === 'string') as string[])
      : [];

  const parsePermissionsString = (value: unknown): string[] => {
    if (typeof value !== 'string') return [];
    return value
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  };

  const rolesToPermissions = (roles: string[]): string[] => {
    const perms = new Set<string>();
    roles.forEach((role) => {
      const lower = role.toLowerCase();
      if (lower.includes('recruiter')) perms.add('recruiter:access');
      if (lower.includes('candidate')) perms.add('candidate:access');
    });
    return Array.from(perms);
  };

  const normalizeAccessToken = (raw: unknown): string | null => {
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') {
      const token =
        (raw as { accessToken?: unknown }).accessToken ??
        (raw as { token?: unknown }).token;
      return typeof token === 'string' ? token : null;
    }
    return null;
  };

  const decodeJwt = (token: string | null): Record<string, unknown> | null => {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const padded = parts[1].padEnd(
        parts[1].length + ((4 - (parts[1].length % 4)) % 4),
        '=',
      );
      const decoded =
        typeof atob === 'function'
          ? atob(padded)
          : Buffer.from(padded, 'base64').toString('utf8');
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const resolveModeForReturnTo = (returnTo: string): 'candidate' | 'recruiter' =>
    modeForPath(returnTo.split('?')[0] || returnTo);

  const toSafeErrorCode = (error: { code?: unknown; name?: unknown }) => {
    const raw =
      (typeof error.code === 'string' && error.code) ||
      (typeof error.name === 'string' && error.name) ||
      'auth_callback_error';
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  };

  const toSafeErrorMessage = (error: unknown) => {
    const raw =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : null;
    if (!raw) return null;
    const trimmed = raw
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[?&#].*/g, '')
      .replace(/[^a-zA-Z0-9 .,:;_()-]/g, '')
      .trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 160);
  };

  const createAuthErrorId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      const maybe = (crypto as { randomUUID?: () => string }).randomUUID;
      if (typeof maybe === 'function') return maybe();
    }
    return `auth-${Date.now().toString(36)}-${Math.random()
      .toString(16)
      .slice(2, 10)}`;
  };

  const resolveBaseUrl = () => {
    const raw = process.env.TENON_APP_BASE_URL;
    if (!raw) return null;
    try {
      return new URL(raw);
    } catch {
      return null;
    }
  };

  const buildRedirect = (path: string) => {
    const base = resolveBaseUrl();
    return base ? new URL(path, base) : path;
  };

  return new Auth0Client({
    appBaseUrl: process.env.TENON_APP_BASE_URL,
    domain: process.env.TENON_AUTH0_DOMAIN,
    clientId: process.env.TENON_AUTH0_CLIENT_ID,
    clientSecret: process.env.TENON_AUTH0_CLIENT_SECRET,
    secret: process.env.TENON_AUTH0_SECRET,
    authorizationParameters: {
      audience: process.env.TENON_AUTH0_AUDIENCE,
      scope: process.env.TENON_AUTH0_SCOPE,
    },
    signInReturnToPath: '/dashboard',
    onCallback: async (error, ctx) => {
      if (error) {
        const errorId = createAuthErrorId();
        const safeReturnTo = sanitizeReturnTo(ctx.returnTo);
        const mode = resolveModeForReturnTo(safeReturnTo);
        const errorCode = toSafeErrorCode(error);
        const errorMessage = toSafeErrorMessage(error);
        // eslint-disable-next-line no-console
        console.warn(
          `[auth0] callback error id=${errorId} code=${errorCode}${errorMessage ? ` msg=${errorMessage}` : ''}`,
        );

        const params = new URLSearchParams();
        params.set('mode', mode);
        params.set('returnTo', safeReturnTo);
        params.set('error', 'callback_failed');
        params.set('errorCode', errorCode);
        params.set('errorId', errorId);
        return NextResponse.redirect(
          buildRedirect(`/auth/error?${params.toString()}`),
        );
      }
      const returnTo = sanitizeReturnTo(ctx.returnTo);
      return NextResponse.redirect(buildRedirect(returnTo));
    },
    beforeSessionSaved: async (session, idToken) => {
      const user = normalizeUserClaims(
        (session.user ?? {}) as Record<string, unknown>,
      );
      const userPerms = [
        ...toStringArray(user[CUSTOM_CLAIM_PERMISSIONS]),
        ...toStringArray(user.permissions),
        ...parsePermissionsString(user[CUSTOM_CLAIM_PERMISSIONS_STR]),
      ];
      const userRoles = toStringArray(
        user[CUSTOM_CLAIM_ROLES] ?? (user.roles as unknown),
      );

      const accessToken = normalizeAccessToken(
        (session as { accessToken?: unknown }).accessToken,
      );
      const tokenClaims = decodeJwt(accessToken) ?? decodeJwt(idToken) ?? {};
      const tokenPerms = [
        ...toStringArray(tokenClaims[CUSTOM_CLAIM_PERMISSIONS]),
        ...toStringArray(tokenClaims.permissions as unknown),
        ...parsePermissionsString(tokenClaims[CUSTOM_CLAIM_PERMISSIONS_STR]),
      ];
      const tokenRoles = toStringArray(
        tokenClaims[CUSTOM_CLAIM_ROLES] ?? (tokenClaims.roles as unknown),
      );

      const normalizedPerms =
        userPerms.length > 0
          ? userPerms
          : [
              ...tokenPerms,
              ...rolesToPermissions(userRoles),
              ...rolesToPermissions(tokenRoles),
            ];
      const normalizedRoles = userRoles.length > 0 ? userRoles : tokenRoles;

      const merged: Record<string, unknown> = {
        ...user,
        permissions:
          normalizedPerms.length > 0 ? normalizedPerms : user.permissions,
        roles: normalizedRoles.length > 0 ? normalizedRoles : user.roles,
      };
      if (normalizedPerms.length > 0) {
        merged[CUSTOM_CLAIM_PERMISSIONS] = normalizedPerms;
      }
      if (normalizedRoles.length > 0) {
        merged[CUSTOM_CLAIM_ROLES] = normalizedRoles;
      }
      session.user = merged as typeof session.user;
      return session;
    },
  });
}

export const auth0 = hasAuth0Env()
  ? createClient()
  : {
      middleware: async () => NextResponse.next(),
      getSession: async () => null,
      getAccessToken: async () => {
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
