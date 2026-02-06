import { safeRequest } from '@/lib/api/client';
import { normalizeSimulation } from './simulationsNormalize';
import { requestRecruiterBff } from './requestRecruiterBff';
import type { SimulationListItem } from './types';

export async function listSimulations(options?: {
  signal?: AbortSignal;
  cache?: RequestCache;
  skipCache?: boolean;
  cacheTtlMs?: number;
}): Promise<SimulationListItem[]> {
  const { data } = await requestRecruiterBff<unknown>('/simulations', {
    cache: options?.cache,
    signal: options?.signal,
    skipCache: options?.skipCache,
    cacheTtlMs: options?.cacheTtlMs ?? 9000,
  });
  return Array.isArray(data) ? data.map(normalizeSimulation) : [];
}

export async function listSimulationsSafe() {
  return safeRequest<SimulationListItem[]>('/simulations', undefined, {
    basePath: '/api',
    skipAuth: true,
  });
}
