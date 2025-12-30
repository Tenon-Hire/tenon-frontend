import type { Metadata } from 'next';
import SimulationCreatePage from '@/features/recruiter/simulations/SimulationCreatePage';

export const metadata: Metadata = {
  title: 'Create simulation | SimuHire',
  description: 'Set up a new 5-day simulation for candidates.',
};

export default function Page() {
  return <SimulationCreatePage />;
}
