import { NextResponse } from 'next/server';
import { parseUpstreamBody, upstreamRequest } from '@/lib/server/bff';
import type { RecruiterProfile } from '@/types/recruiter';
import {
  extractMeta,
  normalizeErrorMessage,
  unauthorizedResponse,
} from './normalize';

export type ProfileResult = {
  profile: RecruiterProfile | null;
  error: string | null;
  status: number | null;
  meta?: { attempts?: number; durationMs?: number };
  response?: NextResponse;
};

export async function fetchProfile(args: {
  backendBase: string;
  headers: Record<string, string>;
  requestId: string;
  signal?: AbortSignal;
}): Promise<ProfileResult> {
  const res = await upstreamRequest({
    url: `${args.backendBase}/api/auth/me`,
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
      response: unauthorizedResponse(body, res.status, args.requestId),
      profile: null,
      error: null,
      status: res.status,
      meta,
    };
  }

  if (res.ok) {
    return {
      profile: (body as RecruiterProfile) ?? null,
      error: null,
      status: res.status,
      meta,
    };
  }

  return {
    profile: null,
    error: normalizeErrorMessage(
      body,
      'Unable to load your profile right now.',
    ),
    status: res.status,
    meta,
  };
}
