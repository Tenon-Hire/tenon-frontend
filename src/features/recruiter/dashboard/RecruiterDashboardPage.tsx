'use client';

import DashboardView from '@/features/recruiter/dashboard/DashboardView';
import type { RecruiterProfile } from '@/types/recruiter';

type RecruiterDashboardPageProps = {
  profile: RecruiterProfile | null;
  error: string | null;
};

export default function RecruiterDashboardPage({
  profile,
  error,
}: RecruiterDashboardPageProps) {
  return <DashboardView profile={profile} error={error} />;
}
