import type { CandidateSession } from '@/types/recruiter';
import { statusMeta as sharedStatusMeta } from '@/features/shared/status/statusMeta';

export const statusMeta = (status: CandidateSession['status']) =>
  sharedStatusMeta(status);
