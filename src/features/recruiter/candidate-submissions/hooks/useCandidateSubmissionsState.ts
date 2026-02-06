import { useMemo, useState } from 'react';
import type { CandidateSession } from '@/types/recruiter';
import type { SubmissionArtifact, SubmissionListItem } from '../types';
import { computeLatestArtifacts } from './computeLatestArtifacts';

export type CandidateSubmissionsState = {
  loading: boolean;
  error: string | null;
  artifactWarning: string | null;
  candidate: CandidateSession | null;
  items: SubmissionListItem[];
  artifacts: Record<number, SubmissionArtifact>;
  showAll: boolean;
} & ReturnType<typeof computeLatestArtifacts>;

export function useCandidateSubmissionsState() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artifactWarning, setArtifactWarning] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateSession | null>(null);
  const [items, setItems] = useState<SubmissionListItem[]>([]);
  const [artifacts, setArtifacts] = useState<
    Record<number, SubmissionArtifact>
  >({});
  const [showAll, setShowAll] = useState(false);

  const derived = useMemo(
    () => computeLatestArtifacts(items, artifacts),
    [artifacts, items],
  );

  const state: CandidateSubmissionsState = {
    loading,
    error,
    artifactWarning,
    candidate,
    items,
    artifacts,
    showAll,
    ...derived,
  };

  const setters = useMemo(
    () => ({
      setLoading,
      setError,
      setArtifactWarning,
      setCandidate,
      setItems,
      setArtifacts,
      setShowAll,
    }),
    [
      setLoading,
      setError,
      setArtifactWarning,
      setCandidate,
      setItems,
      setArtifacts,
      setShowAll,
    ],
  );

  return {
    state,
    setters,
  };
}
