import { useEffect } from 'react';
import { useInviteModalState } from './useInviteModalState';
import { useInviteToasts } from '@/features/recruiter/invitations/useInviteToasts';

type Params = { onRefresh: () => void };

export function useDashboardInvites({ onRefresh }: Params) {
  const { modal, inviteFlow, inviteWho, modalState, openInvite, closeModal } =
    useInviteModalState();
  const { showInviteToast } = useInviteToasts();
  const { reset } = inviteFlow;

  useEffect(() => {
    if (modal.open) reset();
  }, [reset, modal.open]);

  const submitInvite = async (candidateName: string, inviteEmail: string) => {
    const res = await inviteFlow.submit(candidateName, inviteEmail);
    if (!res) return;
    closeModal();
    showInviteToast(res);
    void onRefresh();
  };

  return { modal, modalState, inviteWho, openInvite, closeModal, submitInvite };
}
