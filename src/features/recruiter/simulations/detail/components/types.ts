import type { CandidateSession } from '@/features/recruiter/types';
import type { RowState } from '../hooks/types';
import type { SimulationPlan } from '../utils/plan';

export type SearchState = {
  search: string;
  setSearch: (value: string) => void;
  pagedCandidates: CandidateSession[];
  visibleCandidates: CandidateSession[];
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
};

export type SimulationDetailViewProps = {
  simulationId: string;
  templateKeyLabel: string;
  titleLabel: string;
  roleLabel: string;
  stackLabel: string;
  focusLabel: string;
  scenarioLabel: string | null;
  planDays: { dayIndex: number; task: SimulationPlan['days'][number] | null }[];
  planLoading: boolean;
  planError: string | null;
  reloadPlan: () => void;
  candidates: CandidateSession[];
  candidatesLoading: boolean;
  candidatesError: string | null;
  reloadCandidates: () => void;
  search: SearchState;
  rowStates: Record<string, RowState>;
  onCopy: (candidate: CandidateSession) => void;
  onResend: (candidate: CandidateSession) => void;
  onCloseManual: (id: string) => void;
  cooldownNow: number;
  inviteModalOpen: boolean;
  setInviteModalOpen: (open: boolean) => void;
  inviteFlowState: { status: string; message?: string | null };
  submitInvite: (name: string, email: string) => Promise<void>;
  resetInviteFlow: () => void;
};
