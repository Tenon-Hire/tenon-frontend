import { StatusPill } from '@/components/ui/StatusPill';
import { statusMeta } from '@/features/recruiter/utils/status';
import type { CandidateSession } from '@/types/recruiter';

export function CandidateStatusPill({
  status,
}: {
  status: CandidateSession['status'];
}) {
  const meta = statusMeta(status);
  return <StatusPill label={meta.label} tone={meta.tone} />;
}
