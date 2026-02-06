import type { DashboardOptions, DashboardPayload } from './dashboardTypes';

export type DashboardState = {
  profile: DashboardPayload['profile'];
  simulations: DashboardPayload['simulations'];
  requestId: string | null;
  profileError: string | null;
  simError: string | null;
  loadingProfile: boolean;
  loadingSimulations: boolean;
};

export const makeInitialDashboardState = (
  options?: DashboardOptions,
): DashboardState => ({
  profile: options?.initialProfile ?? null,
  simulations: [],
  requestId: null,
  profileError: options?.initialProfileError ?? null,
  simError: null,
  loadingProfile: options?.fetchOnMount !== false,
  loadingSimulations: options?.fetchOnMount !== false,
});
