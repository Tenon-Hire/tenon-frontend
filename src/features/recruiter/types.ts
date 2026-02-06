import type { SimulationListItem } from '@/features/recruiter/api';

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
  outcome: 'created' | 'resent';
  candidateName: string;
  candidateEmail: string;
  simulationId: string;
};

export type CandidateSession = {
  candidateSessionId: number;
  inviteEmail: string | null;
  candidateName: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | string;
  startedAt: string | null;
  completedAt: string | null;
  hasReport: boolean;
  reportReady?: boolean | null;
  reportId?: string | null;
  inviteToken?: string | null;
  inviteUrl?: string | null;
  inviteEmailStatus?: 'sent' | 'failed' | 'rate_limited' | string | null;
  inviteEmailSentAt?: string | null;
  inviteEmailError?: string | null;
  verified?: boolean | null;
  verificationStatus?: string | null;
  verifiedAt?: string | null;
  dayProgress?: { current: number; total: number } | null;
};

export type { SimulationListItem };
