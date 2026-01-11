'use client';

type DayStatus = 'completed' | 'current' | 'locked';

const DAY_SUMMARIES = [
  {
    title: 'Kickoff brief',
    detail: 'Understand the prompt and outline your approach.',
    hint: 'Submit your written response.',
  },
  {
    title: 'Build in GitHub',
    detail: 'Implement the feature in your workspace.',
    hint: 'Workspace + tests.',
  },
  {
    title: 'Debug + iterate',
    detail: 'Fix issues and ship a clean run.',
    hint: 'Workspace + tests.',
  },
  {
    title: 'Record walkthrough',
    detail: 'Share a short handoff recording.',
    hint: 'Recording link.',
  },
  {
    title: 'Write documentation',
    detail: 'Summarize decisions and next steps.',
    hint: 'Documentation link.',
  },
];

function statusLabel(status: DayStatus) {
  if (status === 'completed') return 'Completed';
  if (status === 'current') return 'In progress';
  return 'Locked';
}

function statusMessage(status: DayStatus, dayIndex: number) {
  if (status === 'completed') return 'Done';
  if (status === 'current') return 'You are here';
  return `Complete Day ${Math.max(dayIndex - 1, 1)} first.`;
}

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {totalDays}-day timeline
          </div>
          <div className="text-xs text-gray-600">
            Complete each day in order to unlock the next step.
          </div>
          <div className="text-xs text-gray-500">
            Locked days preview what’s ahead — you’ll unlock them as you
            complete each day.
          </div>
        </div>
        <div className="text-xs font-semibold text-gray-500">
          {completedCount}/{totalDays} complete
        </div>
      </div>

      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {days.map((day) => {
          const status: DayStatus =
            day <= completedCount
              ? 'completed'
              : day === currentDayIndex
                ? 'current'
                : 'locked';

          const summary = DAY_SUMMARIES[day - 1];
          const title =
            day === currentDayIndex && currentTaskTitle
              ? currentTaskTitle
              : (summary?.title ?? `Day ${day}`);

          return (
            <li key={day} className="text-xs">
              <div
                className={[
                  'h-full rounded-md border px-3 py-3',
                  status === 'completed' ? 'bg-green-50 border-green-200' : '',
                  status === 'current' ? 'bg-blue-50 border-blue-200' : '',
                  status === 'locked'
                    ? 'bg-gray-50 border-gray-200 opacity-70'
                    : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Day {day}
                  </div>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    {statusLabel(status)}
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {title}
                </div>
                {summary?.detail ? (
                  <div className="mt-1 text-xs text-gray-600">
                    {summary.detail}
                  </div>
                ) : null}
                {summary?.hint ? (
                  <div className="mt-2 text-[11px] font-medium text-gray-500">
                    {summary.hint}
                  </div>
                ) : null}
                <div className="mt-2 text-[11px] font-medium text-gray-700">
                  {statusMessage(status, day)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
