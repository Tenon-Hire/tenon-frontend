import Link from 'next/link';
import Button from '@/components/ui/Button';
import type { SimulationListItem } from '@/lib/api/recruiter';
import { formatCreatedDate } from '../utils/formatters';

type SimulationListProps = {
  simulations: SimulationListItem[];
  onInvite: (sim: SimulationListItem) => void;
};

export function SimulationList({ simulations, onInvite }: SimulationListProps) {
  if (!simulations.length) {
    return (
      <div className="rounded border border-gray-200 p-4">
        <p className="text-sm text-gray-600">No simulations yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-200">
      <div className="grid grid-cols-12 gap-3 border-b border-gray-200 bg-gray-50 p-3 text-xs font-medium uppercase tracking-wide text-gray-500">
        <div className="col-span-4">Title</div>
        <div className="col-span-3">Role</div>
        <div className="col-span-3">Created</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {simulations.map((sim) => (
        <div
          key={sim.id}
          className="border-b border-gray-200 p-3 last:border-b-0"
        >
          <div className="grid grid-cols-12 items-center gap-3">
            <div className="col-span-4">
              <Link
                href={`/dashboard/simulations/${sim.id}`}
                prefetch
                className="font-medium text-blue-600 hover:underline"
              >
                {sim.title}
              </Link>
              {typeof sim.candidateCount === 'number' ? (
                <p className="text-xs text-gray-500">
                  {sim.candidateCount} candidate(s)
                </p>
              ) : null}
            </div>

            <div className="col-span-3">
              <p className="text-sm text-gray-700">{sim.role}</p>
            </div>

            <div className="col-span-3">
              <p className="text-sm text-gray-700">
                {formatCreatedDate(sim.createdAt)}
              </p>
            </div>

            <div className="col-span-2 flex justify-end">
              <Button onClick={() => onInvite(sim)}>Invite candidate</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
