import type { Metadata } from 'next';
import CandidateDashboardPage from '@/features/candidate/dashboard/CandidateDashboardPage';
import { BRAND_NAME } from '@/lib/brand';
import { getCachedSessionNormalized } from '@/lib/auth0';

export const metadata: Metadata = {
  title: `Candidate dashboard | ${BRAND_NAME}`,
  description: `Continue your ${BRAND_NAME} simulations and invites.`,
};

export default async function CandidateDashboardRoute() {
  const session = await getCachedSessionNormalized();
  const signedInEmail =
    session?.user && typeof session.user.email === 'string'
      ? session.user.email
      : null;
  return <CandidateDashboardPage signedInEmail={signedInEmail} />;
}
