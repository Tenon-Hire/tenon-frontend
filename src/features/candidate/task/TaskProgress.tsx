'use client';

type DayStatus = 'completed' | 'current' | 'locked';

function statusLabel(s: DayStatus) {
  if (s === 'completed') return 'Completed';
  if (s === 'current') return 'Current';
  return 'Locked';
}

export default function TaskProgress({
  completedCount,
  currentDayIndex,
  totalDays = 5,
}: {
  completedCount: number;
  currentDayIndex: number;
  totalDays?: number;
}) {
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div className="border rounded-md p-3">
      <div className="text-sm font-semibold mb-2">Progress</div>
      <ol className="grid grid-cols-5 gap-2">
        {days.map((day) => {
          const status: DayStatus =
            day <= completedCount
              ? 'completed'
              : day === currentDayIndex
                ? 'current'
                : 'locked';

          return (
            <li key={day} className="text-xs">
              <div
                className={[
                  'rounded-md border px-2 py-2',
                  status === 'completed' ? 'bg-green-50 border-green-200' : '',
                  status === 'current' ? 'bg-blue-50 border-blue-200' : '',
                  status === 'locked'
                    ? 'bg-gray-50 border-gray-200 opacity-70'
                    : '',
                ].join(' ')}
              >
                <div className="font-medium">Day {day}</div>
                <div className="mt-1">{statusLabel(status)}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
