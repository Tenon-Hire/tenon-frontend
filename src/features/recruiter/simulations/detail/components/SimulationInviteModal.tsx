import {
  InviteCandidateModal,
  type InviteUiState,
} from '@/features/recruiter/invitations/InviteCandidateModal';
import type { SimulationDetailViewProps } from './types';

type Props = {
  simulationId: string;
  open: boolean;
  inviteFlowState: SimulationDetailViewProps['inviteFlowState'];
  onClose: () => void;
  onSubmit: (name: string, email: string) => Promise<void>;
};

export function SimulationInviteModal({
  simulationId,
  open,
  inviteFlowState,
  onClose,
  onSubmit,
}: Props) {
  const state: InviteUiState =
    inviteFlowState.status === 'error'
      ? { status: 'error', message: inviteFlowState.message ?? '' }
      : inviteFlowState.status === 'loading'
        ? { status: 'loading' }
        : inviteFlowState.status === 'success'
          ? { status: 'success', message: inviteFlowState.message || undefined }
          : { status: 'idle' };

  return (
    <InviteCandidateModal
      open={open}
      title={`Simulation ${simulationId}`}
      state={state}
      onClose={onClose}
      onSubmit={onSubmit}
      initialName=""
      initialEmail=""
    />
  );
}
