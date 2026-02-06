'use client';
import { SimulationPlan } from '../utils/plan';
import { SimulationPlanContent } from './SimulationPlanContent';

type Props = {
  templateKeyLabel: string;
  roleLabel: string;
  stackLabel: string;
  focusLabel: string;
  scenarioLabel: string | null;
  planDays: { dayIndex: number; task: SimulationPlan['days'][number] | null }[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function SimulationPlanSection({
  templateKeyLabel,
  roleLabel,
  stackLabel,
  focusLabel,
  scenarioLabel,
  planDays,
  loading,
  error,
  onRetry,
}: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <Header />
      {loading ? (
        <div className="mt-4 text-sm text-gray-600">Loading plan details…</div>
      ) : error ? (
        <Error onRetry={onRetry} message={error} />
      ) : planDays.length ? (
        <SimulationPlanContent
          templateKeyLabel={templateKeyLabel}
          roleLabel={roleLabel}
          stackLabel={stackLabel}
          focusLabel={focusLabel}
          scenarioLabel={scenarioLabel}
          planDays={planDays}
        />
      ) : (
        <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          No simulation plan details available.
        </div>
      )}
    </div>
  );
}

const Header = () => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">
        5-day simulation plan
      </h2>
      <p className="text-sm text-gray-600">
        Review the generated prompts and rubrics before inviting candidates.
      </p>
    </div>
    <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
      Read-only
    </div>
  </div>
);

const Error = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
    {message}
    <div className="mt-2">
      <button className="text-blue-600 underline" onClick={onRetry}>
        Retry
      </button>
    </div>
  </div>
);
