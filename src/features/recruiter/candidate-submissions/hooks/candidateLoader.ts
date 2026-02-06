import { fetchSubmissions, verifyCandidate } from '../utils/data';
import { pickLatestByDay } from '../utils/pickLatest';
import type { SubmissionListItem } from '../types';
import type { CandidateSession } from '@/types/recruiter';

type LoadParams = {
  simulationId: string;
  candidateSessionId: string;
  signal: AbortSignal;
  skipCache?: boolean;
  pageSize?: number;
  includePageItems?: boolean;
};

export type CandidateLoadResult = {
  candidate: CandidateSession | null;
  ordered: SubmissionListItem[];
  latestIds: number[];
  error?: unknown;
};

export async function loadCandidateAndSubmissions({
  simulationId,
  candidateSessionId,
  signal,
  skipCache,
  pageSize,
  includePageItems,
}: LoadParams): Promise<CandidateLoadResult> {
  try {
    const candidate = await verifyCandidate(
      simulationId,
      candidateSessionId,
      signal,
    );
    const listJson = await fetchSubmissions(
      candidateSessionId,
      signal,
      skipCache,
    );
    const ordered = [...(listJson.items ?? [])].sort(
      (a, b) => a.dayIndex - b.dayIndex,
    );
    const latest2 = pickLatestByDay(ordered, 2);
    const latest3 = pickLatestByDay(ordered, 3);
    const ids = [
      ...(latest2 ? [latest2.submissionId] : []),
      ...(latest3 ? [latest3.submissionId] : []),
    ];
    if (includePageItems && pageSize) {
      ids.push(...ordered.slice(0, pageSize).map((it) => it.submissionId));
    }
    return {
      candidate,
      ordered,
      latestIds: Array.from(new Set(ids)),
      error: null,
    };
  } catch (error) {
    return {
      candidate: null,
      ordered: [],
      latestIds: [],
      error,
    };
  }
}
