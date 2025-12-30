import { StatusPill } from '@/components/ui/StatusPill';
import { statusMeta } from '@/features/recruiter/helpers/status';
import type { CandidateSession } from '@/features/recruiter/types';

export function CandidateStatusPill({
  status,
}: {
  status: CandidateSession['status'];
}) {
  const meta = statusMeta(status);
  return <StatusPill label={meta.label} tone={meta.tone} />;
}
