'use client';
import { StatusPill } from '@/shared/ui/StatusPill';
import { statusMeta } from '@/shared/status/statusMeta';
import type { CandidateSession } from '@/features/recruiter/types';
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
