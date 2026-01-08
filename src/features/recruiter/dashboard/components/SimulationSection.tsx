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
        <div className="rounded border border-gray-200 bg-white">
          <div className="grid grid-cols-12 gap-3 border-b border-gray-200 bg-gray-50 p-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          </div>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="border-b border-gray-200 p-3 last:border-b-0"
            >
              <div className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                  <div className="mt-1 h-3 w-24 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="col-span-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="col-span-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <div className="h-8 w-28 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
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
