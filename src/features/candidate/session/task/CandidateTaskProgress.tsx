'use client';

import { TaskProgressHeader } from './components/TaskProgressHeader';
import { TaskDayList } from './components/progress/TaskDayList';

export default function CandidateTaskProgress({
  completedCount,
  currentDayIndex,
  totalDays = 5,
  currentTaskTitle,
}: {
  completedCount: number;
  currentDayIndex: number;
  totalDays?: number;
  currentTaskTitle?: string | null;
}) {
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <TaskProgressHeader
        totalDays={totalDays}
        completedCount={completedCount}
      />

      <TaskDayList
        days={days}
        currentDayIndex={currentDayIndex}
        completedCount={completedCount}
        currentTaskTitle={currentTaskTitle}
      />
    </div>
  );
}
