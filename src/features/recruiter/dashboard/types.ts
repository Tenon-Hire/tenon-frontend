import type { SimulationListItem } from '@/lib/recruiterApi';

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

export type { SimulationListItem };
