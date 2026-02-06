'use client';
import { StatusPill } from '@/shared/ui/StatusPill';
import type { CandidateSession } from '@/features/recruiter/types';
import { reportStatusMeta } from '../utils/statusAdapters';

export function CandidateReportCell({
  candidate,
}: {
  candidate: CandidateSession;
}) {
  const meta = reportStatusMeta(candidate);
  return (
    <td className="px-4 py-3 align-top">
      <StatusPill label={meta.label} tone={meta.tone} />
    </td>
  );
}
