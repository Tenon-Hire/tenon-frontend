import { NextResponse } from 'next/server';
import { REQUEST_ID_HEADER, UPSTREAM_HEADER } from '@/lib/server/bff';

export const normalizeErrorMessage = (raw: unknown, fallback: string) => {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const msg =
      (raw as { message?: unknown }).message ??
      (raw as { detail?: unknown }).detail;
    if (typeof msg === 'string') return msg;
  }
  return fallback;
};

export const extractMeta = (res: Response) =>
  (res as unknown as { _tenonMeta?: unknown })._tenonMeta as
    | { attempts?: number; durationMs?: number }
    | undefined;

export const unauthorizedResponse = (
  body: unknown,
  status: number,
  requestId: string,
) => {
  const resp = NextResponse.json(body ?? { message: 'Not authenticated' }, {
    status,
    headers: {
      [UPSTREAM_HEADER]: String(status),
      [REQUEST_ID_HEADER]: requestId,
      'x-tenon-upstream-status-profile': String(status),
      'x-tenon-upstream-status-simulations': '',
    },
  });
  resp.headers.delete('location');
  return resp;
};

export const forbiddenResponse = (
  body: unknown,
  status: number,
  requestId: string,
  profileStatus: number | null,
) => {
  const resp = NextResponse.json(body ?? { message: 'Forbidden' }, {
    status,
    headers: {
      [UPSTREAM_HEADER]: String(status),
      [REQUEST_ID_HEADER]: requestId,
      'x-tenon-upstream-status-profile': String(profileStatus ?? ''),
      'x-tenon-upstream-status-simulations': String(status),
    },
  });
  resp.headers.delete('location');
  return resp;
};
