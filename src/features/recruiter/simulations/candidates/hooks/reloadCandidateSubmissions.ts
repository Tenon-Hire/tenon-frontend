import type { CandidateSession } from '@/features/recruiter/types';
import type { SubmissionArtifact, SubmissionListItem } from '../types';
import { loadArtifacts } from './artifactLoader';
import { loadCandidateAndSubmissions } from './candidateLoader';
import { formatReloadError } from './reloadErrors';

export type ReloadResult = {
  candidate: CandidateSession | null;
  items: SubmissionListItem[];
  artifacts: Record<number, SubmissionArtifact>;
  artifactWarning: string | null;
  error: string | null;
};

export async function reloadCandidateSubmissions(params: {
  simulationId: string;
  candidateSessionId: string;
  pageSize: number;
  showAll: boolean;
  skipCache?: boolean;
  signal: AbortSignal;
}): Promise<ReloadResult> {
  const fallbackMessage = 'Unable to verify candidate access.';
  const {
    simulationId,
    candidateSessionId,
    pageSize,
    showAll,
    skipCache,
    signal,
  } = params;

  if (!candidateSessionId || !/^\d+$/.test(candidateSessionId)) {
    return {
      candidate: null,
      items: [],
      artifacts: {},
      artifactWarning: null,
      error: 'Invalid candidate id.',
    };
  }

  try {
    const { candidate, ordered, latestIds, error } =
      await loadCandidateAndSubmissions({
        simulationId,
        candidateSessionId,
        signal,
        skipCache,
        pageSize,
        includePageItems: showAll,
      });

    if (error) {
      const message = formatReloadError(error, fallbackMessage);
      return {
        candidate: null,
        items: [],
        artifacts: {},
        artifactWarning: null,
        error: message,
      };
    }

    const { artifacts, hadError } = await loadArtifacts(latestIds, signal, {
      skipCache,
    });

    const artifactWarning =
      hadError && Object.keys(artifacts).length === 0
        ? 'Details unavailable for submissions.'
        : null;

    return {
      candidate,
      items: ordered,
      artifacts,
      artifactWarning,
      error: null,
    };
  } catch (e: unknown) {
    const message = formatReloadError(e, fallbackMessage);
    return {
      candidate: null,
      items: [],
      artifacts: {},
      artifactWarning: null,
      error: message,
    };
  }
}
