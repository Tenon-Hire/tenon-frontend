'use client';
import { CandidatesSection } from './sections/CandidatesSection';
import { SimulationPlanSection } from './SimulationPlanSection';
import { SimulationInviteModal } from './SimulationInviteModal';
import { SimulationDetailHeader } from './SimulationDetailHeader';
import { useInviteModalActions } from './InviteModalActions';
import type { SimulationDetailViewProps } from './types';

export function SimulationDetailView(props: SimulationDetailViewProps) {
  const { openInviteModal, closeInviteModal } = useInviteModalActions({
    resetInviteFlow: props.resetInviteFlow,
    setInviteModalOpen: props.setInviteModalOpen,
  });

  return (
    <div className="flex flex-col gap-4 py-8">
      <SimulationDetailHeader
        simulationId={props.simulationId}
        titleLabel={props.titleLabel}
        templateKeyLabel={props.templateKeyLabel}
        onInvite={openInviteModal}
      />
      <SimulationPlanSection
        templateKeyLabel={props.templateKeyLabel}
        roleLabel={props.roleLabel}
        stackLabel={props.stackLabel}
        focusLabel={props.focusLabel}
        scenarioLabel={props.scenarioLabel}
        planDays={props.planDays}
        loading={props.planLoading}
        error={props.planError}
        onRetry={props.reloadPlan}
      />
      <CandidatesSection
        loading={props.candidatesLoading}
        error={props.candidatesError}
        onRetry={props.reloadCandidates}
        search={props.search}
        candidates={props.candidates}
        rowStates={props.rowStates}
        onCopy={props.onCopy}
        onResend={props.onResend}
        onCloseManual={props.onCloseManual}
        cooldownNow={props.cooldownNow}
        simulationId={props.simulationId}
        onInvite={openInviteModal}
      />

      <SimulationInviteModal
        simulationId={props.simulationId}
        open={props.inviteModalOpen}
        inviteFlowState={props.inviteFlowState}
        onClose={closeInviteModal}
        onSubmit={props.submitInvite}
      />
    </div>
  );
}
