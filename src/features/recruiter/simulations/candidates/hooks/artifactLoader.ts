import { fetchArtifactsWithLimit } from '../utils/candidateSubmissionsApi';
import type { SubmissionArtifact } from '../types';

export async function loadArtifacts(
  ids: number[],
  signal: AbortSignal,
  opts?: { skipCache?: boolean; cacheTtlMs?: number; concurrency?: number },
): Promise<{
  artifacts: Record<number, SubmissionArtifact>;
  hadError: boolean;
}> {
  if (!ids.length) return { artifacts: {}, hadError: false };
  const { results, hadError } = await fetchArtifactsWithLimit(ids, {
    signal,
    skipCache: opts?.skipCache,
    cacheTtlMs: opts?.cacheTtlMs ?? 10000,
    concurrency: opts?.concurrency,
  });
  return { artifacts: results, hadError };
}
