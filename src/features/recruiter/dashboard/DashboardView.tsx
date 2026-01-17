'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNotifications } from '@/features/shared/notifications';
import { copyToClipboard } from '../utils/formatters';
import { ProfileCard } from './components/ProfileCard';
import { useInviteCandidateFlow } from './hooks/useInviteCandidateFlow';
import type { InviteModalState, RecruiterProfile } from './types';
import type { SimulationListItem } from '@/types/recruiter';
import { DashboardHeader } from './components/DashboardHeader';
import { SimulationSection } from './components/SimulationSection';
import type { InviteUiState } from '@/features/recruiter/invitations/InviteCandidateModal';

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

type DashboardViewProps = {
  profile: RecruiterProfile | null;
  error: string | null;
  profileLoading?: boolean;
  simulations: SimulationListItem[];
  simulationsError: string | null;
  simulationsLoading: boolean;
  onRefresh: () => void;
};

export default function DashboardView({
  profile,
  error,
  profileLoading = false,
  simulations,
  simulationsError,
  simulationsLoading,
  onRefresh,
}: DashboardViewProps) {
  const { notify, update } = useNotifications();
  const [modal, setModal] = useState<InviteModalState>({
    open: false,
    simulationId: '',
    simulationTitle: '',
  });
  const copyTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(copyTimersRef.current).forEach((timerId) =>
        window.clearTimeout(timerId),
      );
      copyTimersRef.current = {};
    };
  }, []);

  const inviteFlow = useInviteCandidateFlow(modal.open ? modal : null);

  function openInvite(simId: string, simTitle: string) {
    inviteFlow.reset();
    setModal({ open: true, simulationId: simId, simulationTitle: simTitle });
  }

  const inviteWho = useMemo(() => {
    if (!modal.simulationTitle) return '';
    return modal.simulationTitle;
  }, [modal.simulationTitle]);

  const submitInvite = async (candidateName: string, inviteEmail: string) => {
    const resResult = await inviteFlow.submit(candidateName, inviteEmail);
    if (!resResult) return;
    const res = resResult;

    setModal({ open: false, simulationId: '', simulationTitle: '' });

    const who = res.candidateName
      ? `${res.candidateName} (${res.candidateEmail})`
      : res.candidateEmail;

    const actionLabel = res.outcome === 'resent' ? 'resent' : 'sent';
    const toastId = `invite-${res.simulationId}-${res.candidateEmail}`;
    function resetLabel() {
      update(toastId, {
        actions:
          res.inviteUrl && res.inviteUrl.trim()
            ? [
                {
                  label: 'Copy invite link',
                  onClick: handleCopy,
                },
              ]
            : undefined,
      });
      if (copyTimersRef.current[toastId]) {
        window.clearTimeout(copyTimersRef.current[toastId]);
        delete copyTimersRef.current[toastId];
      }
    }

    async function handleCopy() {
      if (!res.inviteUrl) return;
      if (copyTimersRef.current[toastId]) {
        window.clearTimeout(copyTimersRef.current[toastId]);
        delete copyTimersRef.current[toastId];
      }
      const ok = await copyToClipboard(res.inviteUrl);
      if (!ok) {
        notify({
          id: `invite-copy-${res.simulationId}-${res.candidateEmail}`,
          tone: 'error',
          title: 'Copy failed',
          description: 'Copy manually from the simulation detail.',
        });
        resetLabel();
        return;
      }
      update(toastId, {
        actions: [{ label: 'Copied', disabled: true }],
      });
      copyTimersRef.current[toastId] = window.setTimeout(() => {
        resetLabel();
      }, 1800);
    }

    notify({
      id: toastId,
      tone: 'success',
      title: `Invite ${actionLabel} for ${who}.`,
      description: res.inviteUrl
        ? 'Share this link with the candidate.'
        : undefined,
      actions:
        res.inviteUrl && res.inviteUrl.trim()
          ? [
              {
                label: 'Copy invite link',
                onClick: handleCopy,
              },
            ]
          : undefined,
    });

    void onRefresh();
  };

  const modalState: InviteUiState =
    inviteFlow.state.status === 'error'
      ? { status: 'error', message: inviteFlow.state.message ?? '' }
      : { status: inviteFlow.state.status };

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

      {!profile && !error && profileLoading ? (
        <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-48 animate-pulse rounded bg-gray-100" />
        </div>
      ) : null}

      {!profile && !profileLoading && error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      <SimulationSection
        simulations={simulations}
        loading={simulationsLoading}
        error={simulationsError}
        onInvite={(sim) => openInvite(sim.id, sim.title)}
      />

      {modal.open ? (
        <InviteCandidateModal
          open={modal.open}
          title={inviteWho}
          state={modalState}
          onClose={() => {
            setModal({ open: false, simulationId: '', simulationTitle: '' });
          }}
          onSubmit={submitInvite}
          initialName=""
          initialEmail=""
        />
      ) : null}
    </main>
  );
}
