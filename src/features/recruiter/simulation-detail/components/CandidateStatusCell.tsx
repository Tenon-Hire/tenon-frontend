'use client';
import { StatusPill } from '@/components/ui/StatusPill';
import { statusMeta } from '@/features/shared/status/statusMeta';
import type { CandidateSession } from '@/types/recruiter';
import { deriveStatus } from '../utils/formatters';

export function CandidateStatusCell({
  candidate,
}: {
  candidate: CandidateSession;
}) {
  const status = deriveStatus(candidate);
  const meta = statusMeta(status);
  return (
    <td className="px-4 py-3 align-top">
      <StatusPill label={meta.label} tone={meta.tone} />
    </td>
  );
}
