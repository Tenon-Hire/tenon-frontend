'use client';
import { useParams } from 'next/navigation';
import { SimulationDetailView } from './components/SimulationDetailView';
import { useSimulationPlan } from './hooks/useSimulationPlan';
import { useSimulationCandidates } from './hooks/useSimulationCandidates';
import { useCandidatesSearch } from './hooks/useCandidatesSearch';
import { useCandidateRowActions } from './hooks/useCandidateRowActions';
import { useCooldownTick } from './hooks/useCooldownTick';
import { useSimulationInviteModal } from './hooks/useSimulationInviteModal';
import { useSimulationLabels } from './hooks/useSimulationLabels';
import { __testables } from './simulationDetailTestables';

export default function SimulationDetailContainer() {
  const simulationId = useParams<{ id: string }>().id;
  const {
    plan,
    loading: planLoading,
    error: planError,
    reload: reloadPlan,
  } = useSimulationPlan({ simulationId });
  const { candidates, loading, error, reload, setCandidates } =
    useSimulationCandidates({ simulationId });
  const search = useCandidatesSearch({ candidates, pageSize: 25 });
  const { rowStates, handleCopy, handleResend, closeManualCopy } =
    useCandidateRowActions(simulationId, reload, setCandidates);
  const inviteModal = useSimulationInviteModal({
    simulationId,
    reloadCandidates: reload,
  });
  const cooldownTick = useCooldownTick(rowStates);
  const labels = useSimulationLabels(plan, simulationId);

  return (
    <SimulationDetailView
      simulationId={simulationId}
      templateKeyLabel={labels.templateKeyLabel}
      titleLabel={labels.titleLabel}
      roleLabel={labels.roleLabel}
      stackLabel={labels.stackLabel}
      focusLabel={labels.focusLabel}
      scenarioLabel={labels.scenarioLabel}
      planDays={labels.planDays}
      planLoading={planLoading}
      planError={planError}
      reloadPlan={reloadPlan}
      candidates={candidates}
      candidatesLoading={loading}
      candidatesError={error}
      reloadCandidates={reload}
      search={search}
      rowStates={rowStates}
      onCopy={handleCopy}
      onResend={handleResend}
      onCloseManual={closeManualCopy}
      cooldownNow={cooldownTick}
      inviteModalOpen={inviteModal.open}
      setInviteModalOpen={inviteModal.setOpen}
      inviteFlowState={inviteModal.inviteFlowState}
      submitInvite={inviteModal.submitInvite}
      resetInviteFlow={inviteModal.resetInviteFlow}
    />
  );
}

export { __testables };
