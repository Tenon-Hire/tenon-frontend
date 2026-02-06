'use client';
import type { CandidateSession } from '@/types/recruiter';

export function CandidateIdentityCell({
  candidate,
}: {
  candidate: CandidateSession;
}) {
  const display = candidate.candidateName || candidate.inviteEmail || 'Unnamed';
  return (
    <td className="px-4 py-3 align-top">
      <div className="font-medium text-gray-900">{display}</div>
      {candidate.inviteEmail ? (
        <div className="text-xs text-gray-500">{candidate.inviteEmail}</div>
      ) : null}
      <div className="text-xs text-gray-400">
        {candidate.candidateSessionId}
      </div>
    </td>
  );
}
