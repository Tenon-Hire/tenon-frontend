import { NextResponse } from 'next/server';
import {
  REQUEST_ID_HEADER,
  UPSTREAM_HEADER,
  getBackendBaseUrl,
} from '@/lib/server/bff';
import type { RecruiterProfile, SimulationListItem } from '@/types/recruiter';
import { fetchProfile } from './profile';
import { fetchSimulations } from './simulations';
import {
  fallbackProfile,
  fallbackSimulations,
  settled,
  toWorstStatus,
  totalRetries,
} from './dashboardHelpers';

type AuthContext = { accessToken: string; requestId: string };

export async function handleDashboard(
  req: Request,
  auth: AuthContext,
): Promise<NextResponse> {
  const routeStart = Date.now();
  const backendBase = getBackendBaseUrl();
  const authHeaders = { Authorization: `Bearer ${auth.accessToken}` };

  const [profileOutcome, simulationsOutcome] = await Promise.allSettled([
    fetchProfile({
      backendBase,
      headers: authHeaders,
      requestId: auth.requestId,
      signal: req.signal,
    }),
    fetchSimulations({
      backendBase,
      headers: authHeaders,
      requestId: auth.requestId,
      signal: req.signal,
    }),
  ]);

  const profileResult = settled(profileOutcome, fallbackProfile);
  const simulationsResult = settled(simulationsOutcome, fallbackSimulations);

  if (profileResult.response) return profileResult.response;
  if (simulationsResult.response) return simulationsResult.response;

  const worstStatus = toWorstStatus([
    profileResult.status,
    simulationsResult.status,
  ]);

  const payload = {
    profile: profileResult.profile,
    simulations: simulationsResult.simulations,
    profileError: profileResult.error,
    simulationsError: simulationsResult.error,
  } satisfies {
    profile: RecruiterProfile | null;
    simulations: SimulationListItem[];
    profileError: string | null;
    simulationsError: string | null;
  };

  const response = NextResponse.json(payload, {
    status: 200,
    headers: {
      [UPSTREAM_HEADER]: String(worstStatus),
      [REQUEST_ID_HEADER]: auth.requestId,
      'x-tenon-upstream-status-profile': String(profileResult.status ?? ''),
      'x-tenon-upstream-status-simulations': String(
        simulationsResult.status ?? '',
      ),
    },
  });

  response.headers.delete('location');

  const retryCount = totalRetries(
    profileResult.meta?.attempts,
    simulationsResult.meta?.attempts,
  );
  response.headers.set(
    'Server-Timing',
    `bff;dur=${Date.now() - routeStart}, retry;desc="count=${retryCount}"`,
  );

  return response;
}
