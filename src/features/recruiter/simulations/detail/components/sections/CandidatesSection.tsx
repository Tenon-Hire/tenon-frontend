import { CandidatesTable } from '../CandidatesTable';
import type { SimulationDetailViewProps } from '../types';

type Props = {
  loading: SimulationDetailViewProps['candidatesLoading'];
  error: SimulationDetailViewProps['candidatesError'];
  onRetry: SimulationDetailViewProps['reloadCandidates'];
  search: SimulationDetailViewProps['search'];
  candidates: SimulationDetailViewProps['candidates'];
  rowStates: SimulationDetailViewProps['rowStates'];
  onCopy: SimulationDetailViewProps['onCopy'];
  onResend: SimulationDetailViewProps['onResend'];
  onCloseManual: SimulationDetailViewProps['onCloseManual'];
  cooldownNow: SimulationDetailViewProps['cooldownNow'];
  simulationId: SimulationDetailViewProps['simulationId'];
  onInvite: () => void;
};

export function CandidatesSection({
  loading,
  error,
  onRetry,
  search,
  candidates,
  rowStates,
  onCopy,
  onResend,
  onCloseManual,
  cooldownNow,
  simulationId,
  onInvite,
}: Props) {
  return (
    <CandidatesTable
      loading={loading}
      error={error}
      onRetry={onRetry}
      search={search.search}
      setSearch={search.setSearch}
      pagedCandidates={search.pagedCandidates}
      visibleCount={search.visibleCandidates.length}
      totalCount={candidates.length}
      page={search.page}
      pageCount={search.pageCount}
      setPage={search.setPage}
      rowStates={rowStates}
      onCopy={onCopy}
      onResend={onResend}
      onCloseManual={(id) => onCloseManual(String(id))}
      cooldownNow={cooldownNow}
      simulationId={simulationId}
      onInvite={onInvite}
    />
  );
}
