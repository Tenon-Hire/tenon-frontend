import type { Metadata } from 'next';
import SimulationCreatePage from '@/features/recruiter/simulations/SimulationCreatePage';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Create simulation | ${BRAND_NAME}`,
  description: 'Set up a new 5-day simulation for candidates.',
};

export default function Page() {
  return <SimulationCreatePage />;
}
