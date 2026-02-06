import { useCallback } from 'react';
import { useInviteToasts } from '@/features/recruiter/invitations/useInviteToasts';
import type { InviteSuccess } from '@/types/recruiter';

type InviteFlow = {
  submit: (name: string, email: string) => Promise<InviteSuccess | null>;
};

type Params = {
  simulationId: string;
  inviteFlow: InviteFlow;
  closeModal: () => void;
  reload: () => void;
};

export function useInviteSubmit({
  simulationId,
  inviteFlow,
  closeModal,
  reload,
}: Params) {
  const { showInviteToast } = useInviteToasts();

  return useCallback(
    async (candidateName: string, inviteEmail: string) => {
      const res = await inviteFlow.submit(candidateName, inviteEmail);
      if (!res) return;
      closeModal();
      showInviteToast({
        ...res,
        simulationId,
        candidateName,
        candidateEmail: inviteEmail,
      });
      reload();
    },
    [closeModal, inviteFlow, reload, showInviteToast, simulationId],
  );
}
