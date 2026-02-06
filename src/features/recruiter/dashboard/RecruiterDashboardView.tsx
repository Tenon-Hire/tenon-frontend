'use client';

import dynamic from 'next/dynamic';
import type { RecruiterProfile } from './types';
import type { SimulationListItem } from '@/features/recruiter/types';
import { DashboardContent } from './components/DashboardContent';
import { useDashboardInvites } from './hooks/useDashboardInvites';

const InviteCandidateModal = dynamic(
  () =>
    import('@/features/recruiter/invitations/InviteCandidateModal').then(
      (mod) => mod.InviteCandidateModal,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
        <div className="rounded bg-white px-4 py-3 text-sm text-gray-700 shadow">
          Loading invite form…
        </div>
      </div>
    ),
  },
);

type RecruiterDashboardViewProps = {
  profile: RecruiterProfile | null;
  error: string | null;
  profileLoading?: boolean;
  simulations: SimulationListItem[];
  simulationsError: string | null;
  simulationsLoading: boolean;
  onRefresh: () => void;
};

export default function RecruiterDashboardView({
  profile,
  error,
  profileLoading = false,
  simulations,
  simulationsError,
  simulationsLoading,
  onRefresh,
}: RecruiterDashboardViewProps) {
  const { modal, modalState, inviteWho, openInvite, closeModal, submitInvite } =
    useDashboardInvites({ onRefresh });

  return (
    <>
      <DashboardContent
        profile={profile}
        error={error}
        profileLoading={profileLoading}
        simulations={simulations}
        simulationsError={simulationsError}
        simulationsLoading={simulationsLoading}
        onRefresh={onRefresh}
        onOpenInvite={(sim) => openInvite(sim.id, sim.title)}
      />
      {modal.open ? (
        <InviteCandidateModal
          open={modal.open}
          title={inviteWho}
          state={modalState}
          onClose={closeModal}
          onSubmit={submitInvite}
          initialName=""
          initialEmail=""
        />
      ) : null}
    </>
  );
}
