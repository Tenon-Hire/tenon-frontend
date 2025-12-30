import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';
import DashboardPageClient from '@/features/recruiter/dashboard/DashboardPageClient';
import { fetchRecruiterProfile } from './profile';

export const metadata: Metadata = {
  title: 'Dashboard | SimuHire',
  description: 'Manage simulations, candidates, and invites.',
};

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/login');
  }

  const { profile, error } = await fetchRecruiterProfile();

  return <DashboardPageClient profile={profile} error={error} />;
}
