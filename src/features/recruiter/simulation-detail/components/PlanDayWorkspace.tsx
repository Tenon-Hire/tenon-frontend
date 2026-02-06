'use client';
import type { SimulationPlanDay } from '../utils/plan';

type Props = { day: SimulationPlanDay; dayIndex: number };

export function PlanDayWorkspace({ day, dayIndex }: Props) {
  const showRepoStatus = dayIndex === 2 || dayIndex === 3;
  if (!showRepoStatus) return null;

  const repoStatusLabel =
    day.provisioned === true
      ? 'Repo provisioned'
      : day.provisioned === false
        ? 'Repo not provisioned yet'
        : 'Provisioning happens per-candidate after invite.';
  const repoLinkLabel =
    day.provisioned === true || day.provisioned === false
      ? 'Repository'
      : 'Repository link';

  return (
    <div className="mt-3 text-sm text-gray-700">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Day {dayIndex} workspace
      </div>
      <div className="mt-1 flex flex-col gap-1">
        <div>{repoStatusLabel}</div>
        {day.repoUrl ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {repoLinkLabel}
            </div>
            <a
              className="text-blue-600 hover:underline"
              href={day.repoUrl}
              target="_blank"
              rel="noreferrer"
            >
              {day.repoName ?? 'View repository'}
            </a>
          </div>
        ) : (
          day.repoName && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {repoLinkLabel}
              </div>
              <div>{day.repoName}</div>
            </div>
          )
        )}
        {day.codespaceUrl ? (
          <a
            className="text-blue-600 hover:underline"
            href={day.codespaceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open codespace
          </a>
        ) : null}
      </div>
    </div>
  );
}
