import type { Metadata } from 'next';
import CandidateDashboardPage from '@/features/candidate/dashboard/CandidateDashboardPage';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Candidate dashboard | ${BRAND_NAME}`,
  description: `Continue your ${BRAND_NAME} simulations and invites.`,
};

export default function CandidateDashboardRoute() {
  return <CandidateDashboardPage />;
}
