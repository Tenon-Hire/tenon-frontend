import { Buffer } from 'buffer';
import { CUSTOM_CLAIM_EMAIL } from '@/lib/brand';
export type Claims = Record<string, unknown>;

export const decodeSegment = (segment: string): Claims | null => {
  try {
    const padded = segment.padEnd(
      segment.length + ((4 - (segment.length % 4)) % 4),
      '=',
    );
    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded) as Claims;
  } catch {
    return null;
  }
};

export const decodeJwt = (token?: string | null): Claims | null => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  return decodeSegment(parts[1]);
};

export const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

export const parsePermissionsString = (value: unknown): string[] =>
  typeof value !== 'string'
    ? []
    : value
        .split(/[,\s]+/)
        .map((part) => part.trim())
        .filter(Boolean);

export const rolesToPermissions = (roles: string[]): string[] => {
  const perms = new Set<string>();
  roles.forEach((role) => {
    const lower = role.toLowerCase();
    if (lower.includes('recruiter')) perms.add('recruiter:access');
    if (lower.includes('candidate')) perms.add('candidate:access');
  });
  return Array.from(perms);
};

export const appendPermissions = (set: Set<string>, items: string[]) =>
  items.forEach((item) => set.add(item));

export const hasCustomEmail = (claims: Claims) =>
  typeof claims[CUSTOM_CLAIM_EMAIL] === 'string' &&
  Boolean((claims[CUSTOM_CLAIM_EMAIL] as string).trim());
