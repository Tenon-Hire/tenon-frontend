import type { Metadata } from 'next';
import RecruiterSimulationDetailPage from '@/features/recruiter/simulation-detail/RecruiterSimulationDetailPage';

export const metadata: Metadata = {
  title: 'Simulation detail | SimuHire',
  description: 'Review candidates and submissions for this simulation.',
};

export default function Page() {
  return <RecruiterSimulationDetailPage />;
}
