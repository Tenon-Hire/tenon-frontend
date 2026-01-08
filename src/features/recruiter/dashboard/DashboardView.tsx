'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InviteCandidateModal } from '@/features/recruiter/invitations/InviteCandidateModal';
import { InviteToast } from '@/features/recruiter/invitations/InviteToast';
import { ProfileCard } from './components/ProfileCard';
import { useInviteCandidateFlow } from './hooks/useInviteCandidateFlow';
import type { InviteModalState, RecruiterProfile } from './types';
import type { SimulationListItem } from '@/types/recruiter';
import { DashboardHeader } from './components/DashboardHeader';
import { SimulationSection } from './components/SimulationSection';

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
  const router = useRouter();

  const [modal, setModal] = useState<InviteModalState>({
    open: false,
    simulationId: '',
    simulationTitle: '',
  });

  const inviteFlow = useInviteCandidateFlow(modal.open ? modal : null);

  const [toast, setToast] = useState<
    | { open: false }
    | { open: true; kind: 'success'; message: string; inviteUrl?: string }
  >({ open: false });
  const [copied, setCopied] = useState(false);

  const toastTimerRef = useRef<number | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  function dismissToast() {
    setToast({ open: false });
    setCopied(false);
  }

  function openInvite(simId: string, simTitle: string) {
    inviteFlow.reset();
    setModal({ open: true, simulationId: simId, simulationTitle: simTitle });
  }

  const inviteWho = useMemo(() => {
    if (!modal.simulationTitle) return '';
    return modal.simulationTitle;
  }, [modal.simulationTitle]);

  const submitInvite = async (candidateName: string, inviteEmail: string) => {
    const res = await inviteFlow.submit(candidateName, inviteEmail);
    if (!res) return;

    setModal({ open: false, simulationId: '', simulationTitle: '' });

    const who = res.candidateName
      ? `${res.candidateName} (${res.candidateEmail})`
      : res.candidateEmail;

    setToast({
      open: true,
      kind: 'success',
      message: `Invite created for ${who}.`,
      inviteUrl: res.inviteUrl,
    });

    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      dismissToast();
      toastTimerRef.current = null;
    }, 6500);

    void onRefresh();
  };

  return (
    <main className="flex flex-col gap-4 py-8">
      <DashboardHeader
        onNewSimulation={() => router.push('/dashboard/simulations/new')}
      />

      <InviteToast
        toast={toast}
        copied={copied}
        onDismiss={dismissToast}
        onCopyStateChange={(next) => {
          setCopied(next);
          if (copiedTimerRef.current)
            window.clearTimeout(copiedTimerRef.current);
          if (next) {
            copiedTimerRef.current = window.setTimeout(() => {
              setCopied(false);
              copiedTimerRef.current = null;
            }, 1800);
          }
        }}
      />

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

      <InviteCandidateModal
        open={modal.open}
        title={inviteWho}
        state={
          inviteFlow.state.status === 'error'
            ? { status: 'error', message: inviteFlow.state.message ?? '' }
            : { status: inviteFlow.state.status }
        }
        onClose={() =>
          setModal({ open: false, simulationId: '', simulationTitle: '' })
        }
        onSubmit={submitInvite}
        initialName=""
        initialEmail=""
      />
    </main>
  );
}
