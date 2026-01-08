import { SimulationList } from '@/features/recruiter/simulations/SimulationList';
import type { SimulationListItem } from '../types';

type SimulationSectionProps = {
  simulations: SimulationListItem[];
  loading: boolean;
  error: string | null;
  onInvite: (sim: SimulationListItem) => void;
};

export function SimulationSection({
  simulations,
  loading,
  error,
  onInvite,
}: SimulationSectionProps) {
  const hasSimulations = simulations.length > 0;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Simulations</h2>

      {loading && !hasSimulations ? (
        <p className="text-sm text-gray-600">Loading simulations…</p>
      ) : null}

      {!loading && error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">
            Couldn’t load simulations
          </p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {hasSimulations ? (
        <div className="flex flex-col gap-1">
          {loading ? (
            <p className="text-xs text-gray-500">Refreshing…</p>
          ) : null}
          <SimulationList simulations={simulations} onInvite={onInvite} />
        </div>
      ) : null}

      {!loading && !error && !hasSimulations ? (
        <SimulationList simulations={simulations} onInvite={onInvite} />
      ) : null}
    </section>
  );
}
