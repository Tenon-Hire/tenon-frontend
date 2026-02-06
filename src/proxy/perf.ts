import type { NextResponse } from 'next/server';
import { mergeResponseCookies } from '@/lib/server/bffAuth';
import { isNextResponse } from '@/lib/auth/proxyUtils';

export const startPerfTimer = () =>
  process.env.TENON_DEBUG_PERF ? Date.now() : null;

type ResponderArgs = {
  authResponse: unknown;
  pathname: string;
  perfStart: number | null;
};

export function buildResponder({
  authResponse,
  pathname,
  perfStart,
}: ResponderArgs) {
  return (resp: NextResponse) => {
    if (isNextResponse(authResponse)) mergeResponseCookies(authResponse, resp);
    if (perfStart !== null) {
      // eslint-disable-next-line no-console
      console.log(
        `[perf:proxy] ${pathname} -> ${resp.status} ${Date.now() - perfStart}ms`,
      );
    }
    return resp;
  };
}
