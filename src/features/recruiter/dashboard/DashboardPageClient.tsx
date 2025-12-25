'use client';

import DashboardView from '@/features/recruiter/dashboard/DashboardView';
import type { RecruiterProfile } from '@/features/recruiter/dashboard/types';

type DashboardPageClientProps = {
  profile: RecruiterProfile | null;
  error: string | null;
};

export type { RecruiterProfile };

export default function DashboardPageClient({
  profile,
  error,
}: DashboardPageClientProps) {
  return <DashboardView profile={profile} error={error} />;
}
