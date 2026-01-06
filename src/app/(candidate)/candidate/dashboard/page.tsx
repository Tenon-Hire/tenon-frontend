import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CandidateDashboardPage from '@/features/candidate/dashboard/CandidateDashboardPage';
import { BRAND_NAME } from '@/lib/brand';
import { getSessionNormalized } from '@/lib/auth0';

export const metadata: Metadata = {
  title: `Candidate dashboard | ${BRAND_NAME}`,
  description: `Continue your ${BRAND_NAME} simulations and invites.`,
};

export default async function CandidateDashboardRoute() {
  const session = await getSessionNormalized();
  if (!session) {
    redirect('/auth/login?mode=candidate&returnTo=/candidate/dashboard');
  }
  return <CandidateDashboardPage />;
}
