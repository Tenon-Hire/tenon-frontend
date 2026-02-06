import { NextResponse } from 'next/server';
import { parseUpstreamBody, upstreamRequest } from '@/lib/server/bff';
import type { SimulationListItem } from '@/types/recruiter';
import {
  extractMeta,
  forbiddenResponse,
  normalizeErrorMessage,
} from './normalize';

export type SimulationsResult = {
  simulations: SimulationListItem[];
  error: string | null;
  status: number | null;
  meta?: { attempts?: number; durationMs?: number };
  response?: NextResponse;
};

export async function fetchSimulations(args: {
  backendBase: string;
  headers: Record<string, string>;
  requestId: string;
  signal?: AbortSignal;
  profileStatus?: number | null;
}): Promise<SimulationsResult> {
  const res = await upstreamRequest({
    url: `${args.backendBase}/api/simulations`,
    headers: args.headers,
    cache: 'no-store',
    requestId: args.requestId,
    signal: args.signal,
    maxTotalTimeMs: 15000,
  });

  const meta = extractMeta(res);
  const body = await parseUpstreamBody(res);

  if (res.status === 401 || res.status === 403) {
    return {
      response: forbiddenResponse(
        body,
        res.status,
        args.requestId,
        args.profileStatus ?? null,
      ),
      simulations: [],
      error: null,
      status: res.status,
      meta,
    };
  }

  if (res.status >= 500) {
    return {
      simulations: [],
      error: normalizeErrorMessage(body, 'Failed to load simulations.'),
      status: res.status,
      meta,
    };
  }

  const simulations = Array.isArray(body) ? (body as SimulationListItem[]) : [];
  const error = !res.ok
    ? normalizeErrorMessage(body, 'Failed to load simulations.')
    : null;

  return { simulations, error, status: res.status, meta };
}
