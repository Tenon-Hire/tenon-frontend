import {
  appendPermissions,
  decodeJwt,
  hasCustomEmail,
  parsePermissionsString,
  rolesToPermissions,
  toStringArray,
  type Claims,
} from './auth/claimsDecode';
import {
  CUSTOM_CLAIM_EMAIL,
  CUSTOM_CLAIM_PERMISSIONS,
  CUSTOM_CLAIM_PERMISSIONS_STR,
  CUSTOM_CLAIM_ROLES,
} from '@/lib/brand';

export function normalizeUserClaims(user?: Claims | null): Claims {
  const claims = (user ?? {}) as Claims;
  const normalized: Claims = { ...claims };
  const namespacedPermissions = toStringArray(claims[CUSTOM_CLAIM_PERMISSIONS]);
  const existingPermissions = toStringArray(claims.permissions);
  if (existingPermissions.length === 0 && namespacedPermissions.length > 0) {
    normalized.permissions = namespacedPermissions;
  }
  const namespacedRoles = toStringArray(claims[CUSTOM_CLAIM_ROLES]);
  const existingRoles = toStringArray(claims.roles);
  if (existingRoles.length === 0 && namespacedRoles.length > 0) {
    normalized.roles = namespacedRoles;
  }
  const namespacedEmail = claims[CUSTOM_CLAIM_EMAIL];
  const existingEmail = claims.email;
  if (
    (existingEmail === undefined ||
      existingEmail === null ||
      (typeof existingEmail === 'string' && !existingEmail.trim())) &&
    typeof namespacedEmail === 'string' &&
    namespacedEmail.trim()
  ) {
    normalized.email = namespacedEmail.trim();
  }

  return normalized;
}

export function extractPermissions(
  user?: Claims | null,
  accessToken?: string | null,
): string[] {
  const normalizedUser = normalizeUserClaims(user);
  const collected = new Set<string>();

  const fromUser = [
    ...(toStringArray(normalizedUser?.permissions) as string[]),
    ...toStringArray(normalizedUser?.[CUSTOM_CLAIM_PERMISSIONS]),
    ...parsePermissionsString(normalizedUser?.[CUSTOM_CLAIM_PERMISSIONS_STR]),
  ];
  appendPermissions(collected, fromUser);

  const userRoles = toStringArray(
    normalizedUser?.[CUSTOM_CLAIM_ROLES] ?? (normalizedUser?.roles as unknown),
  );
  appendPermissions(collected, rolesToPermissions(userRoles));

  if (collected.size > 0) return Array.from(collected);

  const claims = decodeJwt(accessToken);
  const tokenCustom = toStringArray(claims?.[CUSTOM_CLAIM_PERMISSIONS]);
  appendPermissions(collected, tokenCustom);
  appendPermissions(collected, toStringArray(claims?.permissions));
  appendPermissions(
    collected,
    parsePermissionsString(claims?.[CUSTOM_CLAIM_PERMISSIONS_STR]),
  );
  appendPermissions(
    collected,
    rolesToPermissions(
      toStringArray(claims?.[CUSTOM_CLAIM_ROLES] ?? claims?.roles),
    ),
  );

  return Array.from(collected);
}

export const hasPermission = (perms: string[], required: string) =>
  perms.includes(required);

export function getUserEmail(user?: Claims | null): string | null {
  const normalized = normalizeUserClaims(user);
  if (hasCustomEmail(normalized)) {
    const email = normalized[CUSTOM_CLAIM_EMAIL] as string;
    return email.trim();
  }

  const email = user?.email;
  if (typeof email === 'string' && email.trim()) {
    return email.trim();
  }

  return null;
}
