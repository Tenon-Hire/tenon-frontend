import { SimulationList } from '@/features/recruiter/SimulationList';
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
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Simulations</h2>

      {loading ? (
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

      {!loading && !error ? (
        <SimulationList simulations={simulations} onInvite={onInvite} />
      ) : null}
    </section>
  );
}
