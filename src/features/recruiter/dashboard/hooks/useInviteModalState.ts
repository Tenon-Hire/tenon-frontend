import { useMemo, useState } from 'react';
import { useInviteCandidateFlow } from './useInviteCandidateFlow';
import type { InviteModalState } from '../types';
import type { InviteUiState } from '@/features/recruiter/invitations/InviteCandidateModal';

export function useInviteModalState() {
  const [modal, setModal] = useState<InviteModalState>({
    open: false,
    simulationId: '',
    simulationTitle: '',
  });

  const inviteFlow = useInviteCandidateFlow(modal.open ? modal : null);

  const inviteWho = useMemo(() => modal.simulationTitle || '', [modal]);

  const modalState: InviteUiState =
    inviteFlow.state.status === 'error'
      ? { status: 'error', message: inviteFlow.state.message ?? '' }
      : { status: inviteFlow.state.status };

  const openInvite = (simId: string, simTitle: string) => {
    inviteFlow.reset();
    setModal({ open: true, simulationId: simId, simulationTitle: simTitle });
  };

  const closeModal = () =>
    setModal({ open: false, simulationId: '', simulationTitle: '' });

  return { modal, inviteFlow, inviteWho, modalState, openInvite, closeModal };
}
