import type { CandidateSession } from '@/features/recruiter/types';
import type { SubmissionArtifact, SubmissionListItem } from '../types';

export type DataState = {
  loading: boolean;
  error: string | null;
  artifactWarning: string | null;
  candidate: CandidateSession | null;
  items: SubmissionListItem[];
  artifacts: Record<number, SubmissionArtifact>;
  showAll: boolean;
  latestDay2: SubmissionArtifact | null;
  latestDay3: SubmissionArtifact | null;
};

export type DataActions = {
  reload: () => void;
  toggleShowAll: () => void;
  setArtifacts: React.Dispatch<
    React.SetStateAction<Record<number, SubmissionArtifact>>
  >;
};
