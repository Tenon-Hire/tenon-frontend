'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { buildLoginHref } from '@/features/auth/authPaths';
import type { CandidateInvite } from '@/features/candidate/api';
import { useCandidateSession } from '../session/CandidateSessionProvider';
import { DashboardHeader } from './components/DashboardHeader';
import { InviteList } from './components/InviteList';
import { useCandidateInvites } from './hooks/useCandidateInvites';
import { extractInviteToken } from './utils/inviteTokens';

export { extractInviteToken };

export default function CandidateDashboardPage({
  signedInEmail,
}: {
  signedInEmail?: string | null;
}) {
  const router = useRouter();
  const { state, loadAccessToken } = useCandidateSession();
  const { sortedInvites, loading, error, refresh, setError } =
    useCandidateInvites(state.token);

  const displayEmail = useMemo(() => signedInEmail ?? '', [signedInEmail]);

  useEffect(() => {
    if (state.authStatus !== 'unauthenticated') return;
    router.replace(buildLoginHref('/candidate/dashboard', 'candidate'));
  }, [router, state.authStatus]);

  useEffect(() => {
    if (state.token || state.authStatus !== 'idle') return;
    void loadAccessToken();
  }, [loadAccessToken, state.authStatus, state.token]);

  const handleContinue = useCallback(
    (invite: CandidateInvite) => {
      if (invite.isExpired) {
        setError('This invite has expired. Please contact your recruiter.');
        return;
      }

      const token =
        invite.token ??
        (invite.candidateSessionId === state.candidateSessionId
          ? state.inviteToken
          : null);

      if (token) {
        router.push(`/candidate/session/${encodeURIComponent(token)}`);
        return;
      }

      setError('Invite link unavailable. Please reopen your invite email.');
    },
    [router, setError, state.candidateSessionId, state.inviteToken],
  );

  const resolveFallbackToken = useCallback(
    (invite: CandidateInvite) =>
      invite.candidateSessionId === state.candidateSessionId
        ? (state.inviteToken ?? null)
        : null,
    [state.candidateSessionId, state.inviteToken],
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <DashboardHeader email={displayEmail} />
      <InviteList
        invites={sortedInvites}
        loading={loading}
        error={error}
        onRefresh={refresh}
        onContinue={handleContinue}
        resolveFallbackToken={resolveFallbackToken}
      />
    </div>
  );
}
