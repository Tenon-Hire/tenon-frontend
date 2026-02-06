'use client';
import type { CandidateSession } from '@/types/recruiter';
import { StatusPill } from '@/components/ui/StatusPill';
import { dayProgressStatusMeta } from '../utils/statusAdapters';

export function CandidateDayProgressCell({
  candidate,
}: {
  candidate: CandidateSession;
}) {
  const meta = dayProgressStatusMeta(candidate);
  return (
    <td className="px-4 py-3 align-top text-gray-700">
      <StatusPill label={meta.label} tone={meta.tone} />
    </td>
  );
}
