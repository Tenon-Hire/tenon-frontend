import type { NextRequest, NextResponse } from 'next/server';
import {
  normalizeAccessToken,
  redirect,
  redirectNotAuthorized,
  requiresCandidateAccess,
  requiresRecruiterAccess,
} from '@/lib/auth/proxyUtils';
import { extractPermissions, hasPermission } from '@/lib/auth0-claims';
import type { Claims } from '@/lib/auth/claimsDecode';

export const redirectSignedInHome = (
  session: unknown,
  isRootOrLogin: boolean,
  request: NextRequest,
): NextResponse | null => {
  if (!session || !isRootOrLogin) return null;
  const accessToken = normalizeAccessToken(
    (session as { accessToken?: unknown }).accessToken,
  );
  const permissions = extractPermissions(
    (session as { user?: unknown }).user as Claims | null | undefined,
    accessToken,
  );
  if (hasPermission(permissions, 'recruiter:access'))
    return redirect('/dashboard', request);
  if (hasPermission(permissions, 'candidate:access'))
    return redirect('/candidate/dashboard', request);
  return null;
};

export const gateByRole = (
  pathname: string,
  permissions: string[],
  request: NextRequest,
) => {
  const wantsRecruiter = requiresRecruiterAccess(pathname);
  const wantsCandidate = requiresCandidateAccess(pathname);
  const hasRecruiter = hasPermission(permissions, 'recruiter:access');
  const hasCandidate = hasPermission(permissions, 'candidate:access');

  if (wantsRecruiter && !hasRecruiter) {
    return redirectNotAuthorized(request, 'recruiter');
  }
  if (wantsCandidate && hasRecruiter && !hasCandidate) {
    return redirectNotAuthorized(request, 'candidate');
  }
  return null;
};
