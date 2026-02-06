import type { CandidateSession } from '@/features/recruiter/types';
import { statusMeta as sharedStatusMeta } from '@/shared/status/statusMeta';

export const statusMeta = (status: CandidateSession['status']) =>
  sharedStatusMeta(status);
