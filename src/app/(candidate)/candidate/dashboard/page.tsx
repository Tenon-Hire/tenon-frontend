import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CandidateDashboardPage from '@/features/candidate/dashboard/CandidateDashboardPage';
import { BRAND_NAME } from '@/lib/brand';
import { getCachedSessionNormalized } from '@/lib/auth0';
import { buildLoginUrl } from '@/lib/auth/routing';

export const metadata: Metadata = {
  title: `Candidate dashboard | ${BRAND_NAME}`,
  description: `Continue your ${BRAND_NAME} simulations and invites.`,
};

export default async function CandidateDashboardRoute() {
  const session = await getCachedSessionNormalized();
  if (!session) {
    redirect(buildLoginUrl('candidate', '/candidate/dashboard'));
  }
  return <CandidateDashboardPage />;
}
