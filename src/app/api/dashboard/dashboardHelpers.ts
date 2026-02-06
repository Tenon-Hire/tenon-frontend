import type { RecruiterProfile, SimulationListItem } from '@/types/recruiter';

export const fallbackProfile = {
  profile: null,
  error: 'Unable to load your profile right now.',
  status: 502,
  meta: undefined,
};

export const fallbackSimulations = {
  simulations: [],
  error: 'Failed to load simulations.',
  status: 502,
  meta: undefined,
};

export const settled = <T>(outcome: PromiseSettledResult<T>, fallback: T) =>
  outcome.status === 'fulfilled' ? outcome.value : fallback;

export const toWorstStatus = (values: Array<number | null | undefined>) =>
  values.reduce<number>((max, v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.max(max, v);
    return max;
  }, 0);

export const totalRetries = (...attempts: Array<number | undefined>) =>
  attempts.reduce<number>(
    (sum, attempt) => sum + Math.max(0, (attempt ?? 1) - 1),
    0,
  );

export type DashboardPayload = {
  profile: RecruiterProfile | null;
  simulations: SimulationListItem[];
  profileError: string | null;
  simulationsError: string | null;
};
