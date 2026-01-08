'use client';

import DashboardView from '@/features/recruiter/dashboard/DashboardView';
import type { RecruiterProfile } from '@/types/recruiter';
import { useRecruiterProfile } from './hooks/useRecruiterProfile';

type RecruiterDashboardPageProps = {
  profile?: RecruiterProfile | null;
  error?: string | null;
};

export default function RecruiterDashboardPage({
  profile,
  error,
}: RecruiterDashboardPageProps) {
  const {
    profile: resolvedProfile,
    error: profileError,
    loading,
  } = useRecruiterProfile({
    initialProfile: profile,
    initialError: error,
    fetchOnMount: profile === undefined && error === undefined,
  });

  return (
    <DashboardView
      profile={resolvedProfile}
      error={profileError}
      profileLoading={loading}
    />
  );
}
