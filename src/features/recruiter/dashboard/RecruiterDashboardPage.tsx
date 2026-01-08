'use client';

import { useEffect, useRef } from 'react';
import DashboardView from '@/features/recruiter/dashboard/DashboardView';
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
