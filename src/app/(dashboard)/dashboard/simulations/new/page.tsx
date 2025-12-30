import type { Metadata } from 'next';
import CreateSimulationPageClient from '@/features/recruiter/simulations/CreateSimulationPageClient';

export const metadata: Metadata = {
  title: 'Create simulation | SimuHire',
  description: 'Set up a new 5-day simulation for candidates.',
};

export default function Page() {
  return <CreateSimulationPageClient />;
}
