import type { ApiClientOptions } from '../httpClient';
import { HttpError } from '../errors';
import { throwMappedApiError } from '../errorMapping';

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_TENON_API_BASE_URL ?? '/api/backend';
const API_BASE = RAW_API_BASE === '/api' ? '/api/backend' : RAW_API_BASE;

export const baseClientOptions: ApiClientOptions = {
  basePath: API_BASE || '/api/backend',
  skipAuth: false,
};

export function toClientOptions(authToken: string): ApiClientOptions {
  return { ...baseClientOptions, authToken };
}

export function ensureAuthToken(authToken: string | null | undefined) {
  if (!authToken || !authToken.trim()) {
    throw new HttpError(401, 'Not authenticated. Please sign in again.');
  }
}

export function mapCandidateApiError(error: unknown, fallback: string): never {
  throwMappedApiError(error, fallback, 'candidate');
}

export const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

export const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const toDateString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

export const toIdString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

export function toCandidateSessionId(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}
