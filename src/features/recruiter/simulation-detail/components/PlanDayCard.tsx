'use client';
import { SimulationPlanDay } from '../utils/plan';
import { PlanDayRubric } from './PlanDayRubric';
import { PlanDayWorkspace } from './PlanDayWorkspace';

type Props = { slot: { dayIndex: number; task: SimulationPlanDay | null } };

export function PlanDayCard({ slot }: Props) {
  const day = slot.task;
  const dayLabel = `Day ${slot.dayIndex}`;
  if (!day) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {dayLabel}
        </div>
        <div className="mt-1 text-base font-semibold text-gray-900">
          Not generated yet
        </div>
        <p className="mt-2 text-sm text-gray-600">No task available yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {dayLabel}
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {day.title}
          </div>
        </div>
        {day.type ? (
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
            {day.type}
          </span>
        ) : null}
      </div>

      {day.prompt ? (
        <div className="mt-3 text-sm text-gray-700">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Prompt
          </div>
          <p className="mt-1 whitespace-pre-wrap">{day.prompt}</p>
        </div>
      ) : null}

      <PlanDayRubric day={day} />
      <PlanDayWorkspace day={day} dayIndex={slot.dayIndex} />
    </div>
  );
}
