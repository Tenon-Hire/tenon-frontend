import type { Metadata } from 'next';
import RecruiterSimulationDetailPage from '@/features/recruiter/simulation-detail/RecruiterSimulationDetailPage';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Simulation detail | ${BRAND_NAME}`,
  description: 'Review candidates and submissions for this simulation.',
};

export default function Page() {
  return <RecruiterSimulationDetailPage />;
}
