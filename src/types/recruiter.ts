import type { SimulationListItem } from '@/lib/api/recruiter';

export type RecruiterProfile = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type InviteModalState = {
  open: boolean;
  simulationId: string;
  simulationTitle: string;
};

export type InviteSuccess = {
  inviteUrl: string;
  candidateName: string;
  candidateEmail: string;
  simulationId: string;
};

export type CandidateSession = {
  candidateSessionId: number;
  inviteEmail: string | null;
  candidateName: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
  hasReport: boolean;
};

export type StatusPillTone = 'info' | 'success' | 'warning' | 'muted';

export type { SimulationListItem };
