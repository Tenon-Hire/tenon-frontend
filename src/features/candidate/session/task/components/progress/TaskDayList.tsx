import { TaskDayCard } from '../TaskDayCard';
import type { DayStatus } from './daySummaries';
import { DAY_SUMMARIES } from './daySummaries';
import { dayStatusMeta } from './dayStatus';

type Props = {
  days: number[];
  currentDayIndex: number;
  completedCount: number;
  currentTaskTitle?: string | null;
};

const dayStatus = (
  day: number,
  completedCount: number,
  currentDayIndex: number,
): DayStatus => {
  if (day <= completedCount) return 'completed';
  if (day === currentDayIndex) return 'current';
  return 'locked';
};

export function TaskDayList({
  days,
  currentDayIndex,
  completedCount,
  currentTaskTitle,
}: Props) {
  return (
    <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {days.map((day) => {
        const status = dayStatus(day, completedCount, currentDayIndex);
        const summary = DAY_SUMMARIES[day - 1];
        const title =
          day === currentDayIndex && currentTaskTitle
            ? currentTaskTitle
            : (summary?.title ?? `Day ${day}`);
        const statusMeta = dayStatusMeta(status, day);

        return (
          <TaskDayCard
            key={day}
            day={day}
            status={status}
            title={title}
            detail={summary?.detail}
            hint={summary?.hint}
            statusMessage={statusMeta.message}
            statusLabel={statusMeta.label}
            statusTone={statusMeta.tone}
          />
        );
      })}
    </ol>
  );
}
