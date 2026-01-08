'use client';

import DashboardView from '@/features/recruiter/dashboard/DashboardView';
import { useDashboardData } from './hooks/useDashboardData';

export default function RecruiterDashboardPage() {
  const {
    profile,
    profileError,
    simulations,
    simError,
    loadingProfile,
    loadingSimulations,
    refresh,
  } = useDashboardData();

  return (
    <DashboardView
      profile={profile}
      error={profileError}
      profileLoading={loadingProfile}
      simulations={simulations}
      simulationsError={simError}
      simulationsLoading={loadingSimulations}
      onRefresh={() => void refresh()}
    />
  );
}
