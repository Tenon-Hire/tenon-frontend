import type { SubmissionArtifact, SubmissionListItem } from '../types';

export type SubmissionActions = {
  reload: () => void;
  setPage: (page: number) => void;
  toggleShowAll: () => void;
};

export type SubmissionState = {
  loading: boolean;
  error: string | null;
  artifactWarning: string | null;
  candidate: { status?: string | null; inviteEmail?: string | null } | null;
  items: SubmissionListItem[];
  artifacts: Record<number, SubmissionArtifact>;
  page: number;
  totalPages: number;
  showAll: boolean;
  latestDay2: SubmissionArtifact | null;
  latestDay3: SubmissionArtifact | null;
};
