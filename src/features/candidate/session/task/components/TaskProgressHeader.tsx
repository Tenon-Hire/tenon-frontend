'use client';

type Props = {
  totalDays: number;
  completedCount: number;
};

export function TaskProgressHeader({ totalDays, completedCount }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div className="text-sm font-semibold text-gray-900">
          {totalDays}-day timeline
        </div>
        <div className="text-xs text-gray-600">
          Complete each day in order to unlock the next step.
        </div>
        <div className="text-xs text-gray-500">
          Locked days preview what’s ahead — you’ll unlock them as you complete
          each day.
        </div>
      </div>
      <div className="text-xs font-semibold text-gray-500">
        {completedCount}/{totalDays} complete
      </div>
    </div>
  );
}
