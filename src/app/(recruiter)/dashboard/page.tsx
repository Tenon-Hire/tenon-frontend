import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';
import RecruiterDashboardPage from '@/features/recruiter/dashboard/RecruiterDashboardPage';
import { fetchRecruiterProfile } from './profile.server';

export const metadata: Metadata = {
  title: 'Dashboard | SimuHire',
  description: 'Manage simulations, candidates, and invites.',
};

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const { profile, error } = await fetchRecruiterProfile();

  return <RecruiterDashboardPage profile={profile} error={error} />;
}
