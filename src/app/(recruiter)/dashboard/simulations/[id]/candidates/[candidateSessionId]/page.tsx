import type { Metadata } from 'next';
import CandidateSubmissionsPage from '@/features/recruiter/candidate-submissions/CandidateSubmissionsPage';

export const metadata: Metadata = {
  title: 'Candidate submissions | SimuHire',
  description: 'View day-by-day submissions for this candidate.',
};

export default function Page() {
  return <CandidateSubmissionsPage />;
}
