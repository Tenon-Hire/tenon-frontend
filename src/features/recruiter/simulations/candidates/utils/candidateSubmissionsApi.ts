import { recruiterBffClient } from '@/lib/api/client';
import { listSimulationCandidates } from '@/features/recruiter/api';
import type { SubmissionArtifact, SubmissionListResponse } from '../types';

const isAbortError = (err: unknown) =>
  (err instanceof DOMException && err.name === 'AbortError') ||
  (err &&
    typeof err === 'object' &&
    (err as { name?: unknown }).name === 'AbortError');

export async function verifyCandidate(
  simulationId: string,
  candidateSessionId: string,
  signal?: AbortSignal,
  skipCache?: boolean,
) {
  try {
    const candidates = await listSimulationCandidates(simulationId, {
      cache: 'no-store',
      signal,
      skipCache,
      disableDedupe: true,
      cacheTtlMs: 9000,
    });
    const found =
      candidates.find(
        (c) => String(c.candidateSessionId) === candidateSessionId,
      ) ?? null;
    if (!found) throw new Error('Candidate not found for this simulation.');
    return found;
  } catch (e) {
    if ((signal && signal.aborted) || isAbortError(e)) throw e;
    if (typeof e === 'string') throw e;
    const message =
      e instanceof Error && e.message
        ? e.message
        : 'Unable to verify candidate access.';
    throw new Error(message);
  }
}

export async function fetchCandidateSubmissions(
  candidateSessionId: string,
  signal?: AbortSignal,
  skipCache?: boolean,
  simulationId?: string,
): Promise<SubmissionListResponse> {
  const encoded = encodeURIComponent(candidateSessionId);
  const parts = [
    `candidateSessionId=${encoded}`,
    `candidate_session_id=${encoded}`,
  ];
  if (simulationId) {
    const encodedSim = encodeURIComponent(simulationId);
    parts.push(`simulationId=${encodedSim}`, `simulation_id=${encodedSim}`);
  }
  return recruiterBffClient.get<SubmissionListResponse>(
    `/submissions?${parts.join('&')}`,
    {
      cache: 'no-store',
      signal,
      skipCache,
      cacheTtlMs: 9000,
      disableDedupe: true,
    },
  );
}

export async function fetchArtifactsWithLimit(
  ids: number[],
  options: {
    signal?: AbortSignal;
    skipCache?: boolean;
    cacheTtlMs?: number;
    concurrency?: number;
  },
) {
  if (!ids.length) return { results: {}, hadError: false };
  const results: Record<number, SubmissionArtifact> = {};
  const limit = Math.max(1, Math.min(options.concurrency ?? 4, 12));
  let index = 0;
  let hadError = false;
  const worker = async () => {
    while (index < ids.length) {
      const current = ids[index];
      index += 1;
      try {
        const artifact = await recruiterBffClient.get<SubmissionArtifact>(
          `/submissions/${current}`,
          {
            cache: 'no-store',
            signal: options.signal,
            skipCache: options.skipCache,
            cacheTtlMs: options.cacheTtlMs ?? 10000,
            dedupeKey: `submission-${current}`,
          },
        );
        results[current] = artifact;
      } catch {
        hadError = true;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, ids.length) }).map(() => worker()),
  );
  return { results, hadError };
}
