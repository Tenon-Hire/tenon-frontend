'use client';

import DashboardView from '@/features/recruiter/dashboard/DashboardView';
import type { RecruiterProfile } from '@/features/recruiter/dashboard/types';

type RecruiterDashboardContentProps = {
  profile: RecruiterProfile | null;
  error: string | null;
};

export type { RecruiterProfile };

export default function RecruiterDashboardContent({
  profile,
  error,
}: RecruiterDashboardContentProps) {
  return <DashboardView profile={profile} error={error} />;
}
