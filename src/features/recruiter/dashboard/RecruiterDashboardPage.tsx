'use client';

import { useEffect, useRef } from 'react';
import RecruiterDashboardView from '@/features/recruiter/dashboard/RecruiterDashboardView';
import { useDashboardData } from './hooks/useDashboardData';
import { logPerf, nowMs } from './utils/perf';

export default function RecruiterDashboardPage() {
  const renderStartRef = useRef(nowMs());

  const {
    profile,
    profileError,
    simulations,
    simError,
    loadingProfile,
    loadingSimulations,
    refresh,
  } = useDashboardData();

  useEffect(() => {
    logPerf('dashboard-shell-first-render', renderStartRef.current);
  }, []);

  return (
    <RecruiterDashboardView
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
