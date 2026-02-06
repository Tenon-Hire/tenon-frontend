import type { CandidateInvite } from '@/lib/api/candidate';

type Props = { invite: CandidateInvite };

const progressSummary = (invite: CandidateInvite) => {
  const completed = invite.progress?.completed ?? 0;
  const total = invite.progress?.total ?? 0;
  if (!total) return null;
  const pct = Math.min(100, Math.round((completed / total) * 100));
  return { completed, total, pct };
};

export function InviteProgress({ invite }: Props) {
  const summary = progressSummary(invite);
  if (!summary) return null;
  return (
    <div className="mt-3">
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-blue-600"
          style={{ width: `${summary.pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-600">{summary.pct}% complete</div>
    </div>
  );
}
