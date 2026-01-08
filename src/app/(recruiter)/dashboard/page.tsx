import type { Metadata } from 'next';
import { BRAND_NAME } from '@/lib/brand';
import RecruiterDashboardPage from '@/features/recruiter/dashboard/RecruiterDashboardPage';

export const metadata: Metadata = {
  title: `Dashboard | ${BRAND_NAME}`,
  description: 'Manage simulations, candidates, and invites.',
};

export default async function DashboardPage() {
  return <RecruiterDashboardPage />;
}
