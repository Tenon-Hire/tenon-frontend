'use client';
import { PlanDayCard } from './PlanDayCard';
import type { SimulationPlan } from '../utils/plan';

type Props = {
  templateKeyLabel: string;
  roleLabel: string;
  stackLabel: string;
  focusLabel: string;
  scenarioLabel: string | null;
  planDays: { dayIndex: number; task: SimulationPlan['days'][number] | null }[];
};

export function SimulationPlanContent({
  templateKeyLabel,
  roleLabel,
  stackLabel,
  focusLabel,
  scenarioLabel,
  planDays,
}: Props) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Template" value={templateKeyLabel} />
        <Meta label="Role" value={roleLabel} />
        <Meta label="Tech stack" value={stackLabel} />
        <Meta label="Focus" value={focusLabel} />
      </div>
      {scenarioLabel ? (
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Scenario
          </div>
          <p className="mt-1 whitespace-pre-wrap">{scenarioLabel}</p>
        </div>
      ) : null}
      <div className="grid gap-4">
        {planDays.map((slot) => (
          <PlanDayCard key={slot.dayIndex} slot={slot} />
        ))}
      </div>
    </div>
  );
}

const Meta = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
      {label}
    </div>
    <div className="mt-1 text-sm font-semibold text-gray-900">
      {value ?? 'N/A'}
    </div>
  </div>
);
