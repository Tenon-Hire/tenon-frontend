import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextResponse } from 'next/server';
import { normalizeUserClaims } from '@/lib/auth0-claims';
import { sanitizeReturnTo } from '@/lib/auth/routing';
import {
  CUSTOM_CLAIM_PERMISSIONS,
  CUSTOM_CLAIM_PERMISSIONS_STR,
  CUSTOM_CLAIM_ROLES,
} from '@/lib/brand';
import {
  buildRedirect,
  decodeJwt,
  hasAuth0Env,
  normalizeAccessToken,
  parsePermissionsString,
  rolesToPermissions,
  signInReturnToPath,
  toStringArray,
  wrapCallbackErrorRedirect,
} from './helpers';

export function createAuth0Client() {
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
    signInReturnToPath,
    onCallback: async (error, ctx) => {
      const redirect = wrapCallbackErrorRedirect(error, {
        returnTo: ctx.returnTo ?? '',
      });
      if (redirect) return redirect;
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

export const auth0Available = hasAuth0Env();
