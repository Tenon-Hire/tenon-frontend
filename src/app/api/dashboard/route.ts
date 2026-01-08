import { NextRequest, NextResponse } from 'next/server';
import { withRecruiterAuth } from '@/app/api/utils';
import {
  REQUEST_ID_HEADER,
  UPSTREAM_HEADER,
  getBackendBaseUrl,
  parseUpstreamBody,
  upstreamRequest,
} from '@/lib/server/bff';
import type { RecruiterProfile, SimulationListItem } from '@/types/recruiter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

type DashboardPayload = {
  profile: RecruiterProfile | null;
  simulations: SimulationListItem[];
  profileError: string | null;
  simulationsError: string | null;
};

function normalizeErrorMessage(raw: unknown, fallback: string) {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const msg =
      (raw as { message?: unknown }).message ??
      (raw as { detail?: unknown }).detail;
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

export async function GET(req: NextRequest) {
  const routeStart = Date.now();
  return withRecruiterAuth(
    req,
    { tag: 'dashboard', requirePermission: 'recruiter:access' },
    async (auth) => {
      const backendBase = getBackendBaseUrl();
      const authHeaders = { Authorization: `Bearer ${auth.accessToken}` };

      const [profileResult, simulationsResult] = await Promise.allSettled([
        upstreamRequest({
          url: `${backendBase}/api/auth/me`,
          headers: authHeaders,
          cache: 'no-store',
          requestId: auth.requestId,
          signal: req.signal,
          maxTotalTimeMs: 15000,
        }),
        upstreamRequest({
          url: `${backendBase}/api/simulations`,
          headers: authHeaders,
          cache: 'no-store',
          requestId: auth.requestId,
          signal: req.signal,
          maxTotalTimeMs: 15000,
        }),
      ]);

      let profile: RecruiterProfile | null = null;
      let profileError: string | null = null;
      let profileStatus: number | null = null;
      let profileMeta: { attempts?: number; durationMs?: number } | undefined;

      if (profileResult.status === 'fulfilled') {
        const profileResponse = profileResult.value;
        profileStatus = profileResponse.status;
        profileMeta = (profileResponse as unknown as { _tenonMeta?: unknown })
          ._tenonMeta as { attempts?: number; durationMs?: number } | undefined;
        const profileBody = await parseUpstreamBody(profileResponse);

        if (profileResponse.status === 401 || profileResponse.status === 403) {
          const unauthorized = NextResponse.json(
            profileBody ?? { message: 'Not authenticated' },
            {
              status: profileResponse.status,
              headers: {
                [UPSTREAM_HEADER]: String(profileResponse.status),
                [REQUEST_ID_HEADER]: auth.requestId,
                'x-tenon-upstream-status-profile': String(
                  profileResponse.status,
                ),
                'x-tenon-upstream-status-simulations': '',
              },
            },
          );
          unauthorized.headers.delete('location');
          return unauthorized;
        }

        if (profileResponse.ok) {
          profile = (profileBody as RecruiterProfile) ?? null;
        } else {
          profileError = normalizeErrorMessage(
            profileBody,
            'Unable to load your profile right now.',
          );
        }
      } else {
        profileStatus = 502;
        profileError = 'Unable to load your profile right now.';
      }

      let simulations: SimulationListItem[] = [];
      let simulationsError: string | null = null;
      let simulationsStatus: number | null = null;
      let simulationsMeta:
        | { attempts?: number; durationMs?: number }
        | undefined;

      if (simulationsResult.status === 'fulfilled') {
        const simsResponse = simulationsResult.value;
        simulationsStatus = simsResponse.status;
        simulationsMeta = (simsResponse as unknown as { _tenonMeta?: unknown })
          ._tenonMeta as { attempts?: number; durationMs?: number } | undefined;
        const simsBody = await parseUpstreamBody(simsResponse);

        if (simsResponse.status === 401 || simsResponse.status === 403) {
          const forbidden = NextResponse.json(
            simsBody ?? { message: 'Forbidden' },
            {
              status: simsResponse.status,
              headers: {
                [UPSTREAM_HEADER]: String(simsResponse.status),
                [REQUEST_ID_HEADER]: auth.requestId,
                'x-tenon-upstream-status-profile': String(profileStatus ?? ''),
                'x-tenon-upstream-status-simulations': String(
                  simsResponse.status,
                ),
              },
            },
          );
          forbidden.headers.delete('location');
          return forbidden;
        }

        if (simsResponse.status >= 500) {
          simulationsError = normalizeErrorMessage(
            simsBody,
            'Failed to load simulations.',
          );
          simulations = [];
        } else {
          simulations = Array.isArray(simsBody)
            ? (simsBody as SimulationListItem[])
            : [];
          if (!simsResponse.ok && !simulationsError) {
            simulationsError = normalizeErrorMessage(
              simsBody,
              'Failed to load simulations.',
            );
          }
        }
      } else {
        simulationsStatus = 502;
        simulationsError = 'Failed to load simulations.';
      }

      const upstreamStatuses = [profileStatus, simulationsStatus].filter(
        (status): status is number => typeof status === 'number',
      );
      const worstStatus =
        upstreamStatuses.length > 0 ? Math.max(...upstreamStatuses) : 0;

      const payload: DashboardPayload = {
        profile,
        simulations,
        profileError,
        simulationsError,
      };

      const response = NextResponse.json(payload, {
        status: 200,
        headers: {
          [UPSTREAM_HEADER]: String(worstStatus),
          [REQUEST_ID_HEADER]: auth.requestId,
          'x-tenon-upstream-status-profile': String(profileStatus ?? ''),
          'x-tenon-upstream-status-simulations': String(
            simulationsStatus ?? '',
          ),
        },
      });
      response.headers.delete('location');
      const totalDuration = Date.now() - routeStart;
      const retryCount =
        Math.max(0, (profileMeta?.attempts ?? 1) - 1) +
        Math.max(0, (simulationsMeta?.attempts ?? 1) - 1);
      response.headers.set(
        'Server-Timing',
        `bff;dur=${totalDuration}, retry;desc="count=${retryCount}"`,
      );
      return response;
    },
  );
}
