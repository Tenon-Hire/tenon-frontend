import { safeId, recruiterBffClient } from './simUtils';
import type { CandidateSession, CandidateListOptions } from './types';
import { normalizeCandidateSession } from './candidatesNormalize';

const CANDIDATE_CACHE_TTL_MS = 5000;
const candidateCache = new Map<
  string,
  { ts: number; data?: CandidateSession[] }
>();
const inFlightCandidates = new Map<string, Promise<CandidateSession[]>>();

export const __resetCandidateCache = () => {
  candidateCache.clear();
  inFlightCandidates.clear();
};

export function listSimulationCandidates(
  simulationId: string | number,
  options?: CandidateListOptions,
): Promise<CandidateSession[]> {
  const id = safeId(simulationId);
  if (!id) return Promise.resolve([]);

  const now = Date.now();
  const cacheTtl = options?.cacheTtlMs ?? CANDIDATE_CACHE_TTL_MS;
  const skipCache = options?.skipCache === true;
  const cached = !skipCache ? candidateCache.get(id) : undefined;
  if (cached) {
    if (cached.data && now - cached.ts < cacheTtl)
      return Promise.resolve(cached.data);
  }
  if (!skipCache) {
    const inflight = inFlightCandidates.get(id);
    if (inflight) return inflight;
  }

  const request = recruiterBffClient
    .get<unknown>(`/simulations/${encodeURIComponent(id)}/candidates`, {
      cache: options?.cache ?? 'no-store',
      signal: options?.signal,
      skipCache,
      cacheTtlMs: cacheTtl,
    })
    .then((data) => {
      const normalized = Array.isArray(data)
        ? data.map(normalizeCandidateSession)
        : [];
      candidateCache.set(id, { ts: Date.now(), data: normalized });
      inFlightCandidates.delete(id);
      return normalized;
    })
    .catch((error) => {
      candidateCache.delete(id);
      inFlightCandidates.delete(id);
      throw error;
    });

  if (!skipCache) inFlightCandidates.set(id, request);
  return request;
}
