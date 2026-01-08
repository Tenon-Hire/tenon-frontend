'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken as fetchAccessToken,
  useUser,
} from '@auth0/nextjs-auth0/client';
import Button from '@/components/ui/Button';
import {
  type CandidateInvite,
  listCandidateInvites,
} from '@/lib/api/candidate';
import { getUserEmail } from '@/lib/auth0-claims';
import { toUserMessage } from '@/lib/utils/errors';
import { useCandidateSession } from '../session/CandidateSessionProvider';

type InviteCardProps = {
  invite: CandidateInvite;
  onContinue: (invite: CandidateInvite) => void;
  fallbackToken: string | null;
};

export function extractInviteToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const canonicalMatch = trimmed.match(/candidate\/session\/([^/?#\s]+)/i);
  if (canonicalMatch?.[1]) return canonicalMatch[1];

  const legacyMatch = trimmed.match(/candidate-sessions\/([^/?#\s]+)/i);
  if (legacyMatch?.[1]) return legacyMatch[1];

  const parts = trimmed.split('/');
  const last = parts.pop()?.trim() ?? '';
  return last.split(/[?#]/)[0];
}

function formatDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function progressSummary(invite: CandidateInvite) {
  const completed = invite.progress?.completed ?? 0;
  const total = invite.progress?.total ?? 0;
  if (!total) return null;
  const pct = Math.min(100, Math.round((completed / total) * 100));
  return { completed, total, pct };
}

function InviteCard({ invite, onContinue, fallbackToken }: InviteCardProps) {
  const summary = progressSummary(invite);
  const expiry = formatDate(invite.expiresAt);
  const lastActivity = formatDate(invite.lastActivityAt);
  const tokenAvailable = invite.token || fallbackToken;
  const isExpired = invite.isExpired;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-gray-900">
            {invite.title}
          </div>
          <div className="text-sm text-gray-600">
            {invite.role}
            {invite.company ? ` • ${invite.company}` : null}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
              {invite.status.replace(/_/g, ' ')}
            </span>
            {isExpired ? (
              <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">
                Expired
              </span>
            ) : null}
            {summary ? (
              <span>
                Progress: {summary.completed}/{summary.total}
              </span>
            ) : null}
            {lastActivity ? <span>Last active: {lastActivity}</span> : null}
            {expiry ? <span>Expires: {expiry}</span> : null}
          </div>
        </div>

        <Button
          onClick={() => onContinue(invite)}
          disabled={!tokenAvailable || isExpired}
          className="w-full sm:w-auto"
        >
          {invite.status === 'not_started' ? 'Start simulation' : 'Continue'}
        </Button>
      </div>

      {summary ? (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{ width: `${summary.pct}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {summary.pct}% complete
          </div>
        </div>
      ) : null}

      {!tokenAvailable ? (
        <div className="mt-3 text-xs text-amber-700">
          Invite link unavailable. We’ll keep this saved; please open your most
          recent invite email to resume.
        </div>
      ) : null}

      {isExpired ? (
        <div className="mt-3 text-xs text-amber-700">
          This invite has expired. Please contact your recruiter for a new link.
        </div>
      ) : null}
    </div>
  );
}

export default function CandidateDashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { state } = useCandidateSession();

  const [invites, setInvites] = useState<CandidateInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const displayEmail = useMemo(
    () =>
      state.verifiedEmail ??
      getUserEmail(user as Record<string, unknown>) ??
      '',
    [state.verifiedEmail, user],
  );

  const sortedInvites = useMemo(() => {
    return [...invites].sort((a, b) => {
      const aDate = a.lastActivityAt || a.expiresAt || '';
      const bDate = b.lastActivityAt || b.expiresAt || '';
      return bDate.localeCompare(aDate);
    });
  }, [invites]);

  const loadInvites = useCallback(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const accessToken = await fetchAccessToken();
        if (!accessToken) {
          throw new Error('Not authenticated. Please sign in again.');
        }
        const data = await listCandidateInvites(accessToken);
        if (cancelled) return;
        setInvites(data);
      } catch (err) {
        if (cancelled) return;
        setError(toUserMessage(err, 'Unable to load your invites right now.'));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    Promise.resolve().then(() => {
      void run();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = loadInvites();
    return () => {
      cancel?.();
    };
  }, [loadInvites]);

  const handleContinue = (invite: CandidateInvite) => {
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
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold text-gray-900">
          Candidate Dashboard
        </h1>
        <p className="text-sm text-gray-600">
          {displayEmail
            ? `Signed in as ${displayEmail}`
            : 'Signed in with Auth0'}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Your invitations
            </h2>
            <p className="text-sm text-gray-600">
              Pick up where you left off across simulations.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={loadInvites}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2].map((key) => (
              <div
                key={key}
                className="animate-pulse rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
                <div className="mt-4 h-2 w-full rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : sortedInvites.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-700">
            <div className="text-base font-semibold text-gray-900">
              No invites yet
            </div>
            <p className="mt-1 text-sm text-gray-600">
              You’ll see your simulation invites here once a recruiter sends
              them. Check your email for invite links.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {sortedInvites.map((invite) => (
              <InviteCard
                key={`${invite.candidateSessionId}-${invite.token ?? 'no-token'}`}
                invite={invite}
                onContinue={handleContinue}
                fallbackToken={
                  invite.candidateSessionId === state.candidateSessionId
                    ? (state.inviteToken ?? null)
                    : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
