import { ProfileCard } from './ProfileCard';
import { DashboardHeader } from './DashboardHeader';
import { SimulationSection } from './SimulationSection';
import type { RecruiterProfile } from '../types';
import type { SimulationListItem } from '@/types/recruiter';

const ProfileSkeleton = () => (
  <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
    <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
    <div className="mt-2 h-3 w-48 animate-pulse rounded bg-gray-100" />
  </div>
);

type Props = {
  profile: RecruiterProfile | null;
  error: string | null;
  profileLoading?: boolean;
  simulations: SimulationListItem[];
  simulationsError: string | null;
  simulationsLoading: boolean;
  onRefresh: () => void;
  onOpenInvite: (sim: SimulationListItem) => void;
};

export function DashboardContent({
  profile,
  error,
  profileLoading = false,
  simulations,
  simulationsError,
  simulationsLoading,
  onRefresh,
  onOpenInvite,
}: Props) {
  return (
    <main className="flex flex-col gap-4 py-8">
      <DashboardHeader />

      {profile ? (
        <ProfileCard
          name={profile.name}
          email={profile.email}
          role={profile.role}
        />
      ) : null}

      {!profile && !error && profileLoading ? <ProfileSkeleton /> : null}

      {!profile && !profileLoading && error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      <SimulationSection
        simulations={simulations}
        loading={simulationsLoading}
        error={simulationsError}
        onInvite={onOpenInvite}
        onRetry={onRefresh}
      />
    </main>
  );
}
