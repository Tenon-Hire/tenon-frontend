import type { CandidateSubmissionsState } from './useCandidateSubmissionsState';

export type LoaderSetters = {
  setLoading: (next: boolean) => void;
  setError: (value: string | null) => void;
  setArtifactWarning: (value: string | null) => void;
  setCandidate: (value: CandidateSubmissionsState['candidate']) => void;
  setItems: (value: CandidateSubmissionsState['items']) => void;
  setArtifacts: (
    updater:
      | CandidateSubmissionsState['artifacts']
      | ((
          prev: CandidateSubmissionsState['artifacts'],
        ) => CandidateSubmissionsState['artifacts']),
  ) => void;
  setShowAll: (value: boolean) => void;
};
