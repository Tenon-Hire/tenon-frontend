'use client';
import type { SimulationPlanDay } from '../utils/plan';

export function PlanDayRubric({ day }: { day: SimulationPlanDay }) {
  if (!day.rubricItems.length && !day.rubricText) return null;
  return (
    <div className="mt-3 text-sm text-gray-700">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Rubric
      </div>
      {day.rubricItems.length ? (
        <ul className="mt-1 list-disc pl-5">
          {day.rubricItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        day.rubricText && (
          <p className="mt-1 whitespace-pre-wrap">{day.rubricText}</p>
        )
      )}
    </div>
  );
}
