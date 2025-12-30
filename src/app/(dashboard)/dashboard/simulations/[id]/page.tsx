import type { Metadata } from 'next';
import SimulationDetailPageClient from '@/features/recruiter/simulation-detail/SimulationDetailPageClient';

export const metadata: Metadata = {
  title: 'Simulation detail | SimuHire',
  description: 'Review candidates and submissions for this simulation.',
};

export default function Page() {
  return <SimulationDetailPageClient />;
}
