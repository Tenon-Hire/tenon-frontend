import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionNormalized } from '@/lib/auth0';
import { BRAND_NAME } from '@/lib/brand';
import RecruiterDashboardPage from '@/features/recruiter/dashboard/RecruiterDashboardPage';
import { fetchRecruiterProfile } from './profile.server';

export const metadata: Metadata = {
  title: `Dashboard | ${BRAND_NAME}`,
  description: 'Manage simulations, candidates, and invites.',
};

export default async function DashboardPage() {
  const session = await getSessionNormalized();

  if (!session) {
    redirect('/auth/login');
  }

  const { profile, error } = await fetchRecruiterProfile();

  return <RecruiterDashboardPage profile={profile} error={error} />;
}
