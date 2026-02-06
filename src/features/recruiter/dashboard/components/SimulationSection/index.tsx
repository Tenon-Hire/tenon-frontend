import { RecruiterSimulationList } from '@/features/recruiter/simulations/list/RecruiterSimulationList';
import { SimulationError } from './SimulationError';
import { SimulationSkeleton } from './SimulationSkeleton';
import type { SimulationListItem } from '../../types';

type SimulationSectionProps = {
  simulations: SimulationListItem[];
  loading: boolean;
  error: string | null;
  onInvite: (sim: SimulationListItem) => void;
  onRetry?: () => void;
};

export function SimulationSection({
  simulations,
  loading,
  error,
  onInvite,
  onRetry,
}: SimulationSectionProps) {
  const hasSimulations = simulations.length > 0;

  if (loading && !hasSimulations) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Simulations</h2>
        <SimulationSkeleton />
      </section>
    );
  }

  if (!loading && error) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Simulations</h2>
        <SimulationError message={error} onRetry={onRetry} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Simulations</h2>

      {hasSimulations ? (
        <div className="flex flex-col gap-1">
          {loading ? (
            <p className="text-xs text-gray-500">Refreshing…</p>
          ) : null}
          <RecruiterSimulationList
            simulations={simulations}
            onInvite={onInvite}
          />
        </div>
      ) : (
        <RecruiterSimulationList
          simulations={simulations}
          onInvite={onInvite}
        />
      )}
    </section>
  );
}
