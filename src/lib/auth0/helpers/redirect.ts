import { NextResponse } from 'next/server';
import { modeForPath } from '@/lib/auth/routing';
import { buildRedirect } from './baseUrl';
import {
  createAuthErrorId,
  toSafeErrorCode,
  toSafeErrorMessage,
} from './errorSanitize';

export const resolveModeForReturnTo = (
  returnTo: string,
): 'candidate' | 'recruiter' =>
  modeForPath(returnTo.split(/[?#]/)[0] || returnTo);

export const wrapCallbackErrorRedirect = (
  error: { code?: unknown; name?: unknown } | null,
  ctx: { returnTo: string },
) => {
  if (!error) return null;
  const errorId = createAuthErrorId();
  const safeReturnTo = ctx.returnTo;
  const mode = resolveModeForReturnTo(safeReturnTo);
  const errorCode = toSafeErrorCode(error);
  const errorMessage = toSafeErrorMessage(error);
  // eslint-disable-next-line no-console
  console.warn(
    `[auth0] callback error id=${errorId} code=${errorCode}${errorMessage ? ` msg=${errorMessage}` : ''}`,
  );

  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('returnTo', safeReturnTo);
  params.set('error', 'callback_failed');
  params.set('errorCode', errorCode);
  params.set('errorId', errorId);
  return NextResponse.redirect(
    buildRedirect(`/auth/error?${params.toString()}`),
  );
};

export {
  buildRedirect,
  createAuthErrorId,
  toSafeErrorCode,
  toSafeErrorMessage,
};
