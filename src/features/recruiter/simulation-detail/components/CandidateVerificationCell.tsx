'use client';
import type { CandidateSession } from '@/types/recruiter';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime, verificationStatusMeta } from '../utils/formatters';

export function CandidateVerificationCell({
  candidate,
}: {
  candidate: CandidateSession;
}) {
  const verifiedAt = formatDateTime(candidate.verifiedAt ?? null);
  const status = verificationStatusMeta(candidate);
  return (
    <td className="px-4 py-3 align-top text-gray-700">
      <div className="flex flex-col gap-1">
        <StatusPill label={status.label} tone={status.tone} />
        <div className="text-xs text-gray-500">
          {verifiedAt ? `Verified at ${verifiedAt}` : '—'}
        </div>
      </div>
    </td>
  );
}
