import Button from '@/components/ui/Button';
import type { CandidateInvite } from '@/lib/api/candidate';
import { InviteCard } from './InviteCard';

type Props = {
  invites: CandidateInvite[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onContinue: (invite: CandidateInvite) => void;
  resolveFallbackToken: (invite: CandidateInvite) => string | null;
};

export function InviteList({
  invites,
  loading,
  error,
  onRefresh,
  onContinue,
  resolveFallbackToken,
}: Props) {
  return (
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
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
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
      ) : invites.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-700">
          <div className="text-base font-semibold text-gray-900">
            No invites yet
          </div>
          <p className="mt-1 text-sm text-gray-600">
            You’ll see your simulation invites here once a recruiter sends them.
            Check your email for invite links.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {invites.map((invite) => (
            <InviteCard
              key={`${invite.candidateSessionId}-${invite.token ?? 'no-token'}`}
              invite={invite}
              onContinue={onContinue}
              fallbackToken={resolveFallbackToken(invite)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
