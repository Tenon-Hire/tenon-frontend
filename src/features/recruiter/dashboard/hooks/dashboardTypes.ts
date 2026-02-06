import type {
  RecruiterProfile,
  SimulationListItem,
} from '@/features/recruiter/types';

export type DashboardOptions = {
  initialProfile?: RecruiterProfile | null;
  initialProfileError?: string | null;
  fetchOnMount?: boolean;
};

export type DashboardPayload = {
  profile: RecruiterProfile | null;
  simulations: SimulationListItem[];
  profileError: string | null;
  simulationsError: string | null;
  requestId?: string | null;
};
