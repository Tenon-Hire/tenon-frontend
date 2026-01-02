import { Buffer } from 'buffer';
import {
  CUSTOM_CLAIM_EMAIL,
  CUSTOM_CLAIM_PERMISSIONS,
  CUSTOM_CLAIM_PERMISSIONS_STR,
  CUSTOM_CLAIM_ROLES,
} from '@/lib/brand';

type Claims = Record<string, unknown>;

function decodeSegment(segment: string): Claims | null {
  try {
    const padded = segment.padEnd(
      segment.length + ((4 - (segment.length % 4)) % 4),
      '=',
    );
    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as Claims;
    return parsed;
  } catch {
    return null;
  }
}

function decodeJwt(token?: string | null): Claims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  return decodeSegment(parts[1]);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string') as string[];
}

function parsePermissionsString(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function rolesToPermissions(roles: string[]): string[] {
  const perms = new Set<string>();
  roles.forEach((role) => {
    const lower = role.toLowerCase();
    if (lower.includes('recruiter')) perms.add('recruiter:access');
    if (lower.includes('candidate')) perms.add('candidate:access');
  });
  return Array.from(perms);
}

function appendPermissions(set: Set<string>, items: string[]) {
  items.forEach((item) => set.add(item));
}

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

export function hasPermission(perms: string[], required: string) {
  return perms.includes(required);
}

export function getUserEmail(user?: Claims | null): string | null {
  const normalized = normalizeUserClaims(user);
  const customEmail = normalized?.[CUSTOM_CLAIM_EMAIL];
  if (typeof customEmail === 'string' && customEmail.trim()) {
    return customEmail.trim();
  }

  const email = user?.email;
  if (typeof email === 'string' && email.trim()) {
    return email.trim();
  }

  return null;
}
