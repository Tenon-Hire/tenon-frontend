import type { HttpMethod } from './shapes';

export const DEFAULT_CACHE_TTL_MS = 0;
export const MAX_CACHE_TTL_MS = 15000;
export const MAX_CACHE_ENTRIES = 150;

type CacheEntry = { data: unknown; expiresAt: number };
const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();

export function clearCaches() {
  responseCache.clear();
  inflightRequests.clear();
}

export function getInflight<T>(key: string): Promise<T> | null {
  return (inflightRequests.get(key) as Promise<T> | undefined) ?? null;
}

export function setInflight(key: string, promise: Promise<unknown>) {
  inflightRequests.set(key, promise);
}

export function deleteInflight(key: string) {
  inflightRequests.delete(key);
}

export function getCachedResponse<T>(key: string): T | null {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt > Date.now()) return cached.data as T;
  responseCache.delete(key);
  return null;
}

export function setCachedResponse(key: string, data: unknown, ttlMs: number) {
  const expiresAt = Date.now() + Math.min(Math.max(ttlMs, 0), MAX_CACHE_TTL_MS);
  responseCache.set(key, { data, expiresAt });
  if (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value as string | undefined;
    if (oldestKey) responseCache.delete(oldestKey);
  }
}

export function normalizeForCache(targetUrl: string): string {
  try {
    const parsed = new URL(targetUrl, 'http://localhost');
    parsed.hash = '';
    const params = new URLSearchParams(parsed.search);
    params.sort();
    const qs = params.toString();
    return `${parsed.origin}${parsed.pathname}${qs ? `?${qs}` : ''}`;
  } catch {
    return targetUrl;
  }
}

export function buildCacheKey(
  method: HttpMethod,
  targetUrl: string,
  hasAuthToken: boolean,
  dedupeKey?: string,
) {
  const normalized = normalizeForCache(targetUrl);
  const suffix = dedupeKey ? `::${dedupeKey}` : '';
  return `${method}::${normalized}::auth:${hasAuthToken ? '1' : '0'}${suffix}`;
}
