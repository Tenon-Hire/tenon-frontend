import type { Metadata } from 'next';
import CandidateSubmissionsPageClient from '@/features/recruiter/candidate-submissions/CandidateSubmissionsPageClient';

export const metadata: Metadata = {
  title: 'Candidate submissions | SimuHire',
  description: 'View day-by-day submissions for this candidate.',
};

export default function Page() {
  return <CandidateSubmissionsPageClient />;
}
