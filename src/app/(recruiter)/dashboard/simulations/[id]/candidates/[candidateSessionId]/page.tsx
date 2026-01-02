import type { Metadata } from 'next';
import CandidateSubmissionsPage from '@/features/recruiter/candidate-submissions/CandidateSubmissionsPage';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Candidate submissions | ${BRAND_NAME}`,
  description: 'View day-by-day submissions for this candidate.',
};

export default function Page() {
  return <CandidateSubmissionsPage />;
}
