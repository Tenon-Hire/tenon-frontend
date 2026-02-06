'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import type { StatusPillTone } from '@/types/recruiter';
type DayStatus = 'completed' | 'current' | 'locked';

type Props = {
  day: number;
  status: DayStatus;
  title: string;
  detail?: string;
  hint?: string;
  statusMessage: string;
  statusLabel: string;
  statusTone: StatusPillTone;
};

export function TaskDayCard({
  day,
  status: _status,
  title,
  detail,
  hint,
  statusMessage,
  statusLabel,
  statusTone,
}: Props) {
  return (
    <li className="text-xs">
      <div className="h-full rounded-md border border-gray-200 bg-white px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Day {day}
          </div>
          <StatusPill label={statusLabel} tone={statusTone} />
        </div>
        <div className="mt-2 text-sm font-semibold text-gray-900">{title}</div>
        {detail ? (
          <div className="mt-1 text-xs text-gray-600">{detail}</div>
        ) : null}
        {hint ? (
          <div className="mt-2 text-[11px] font-medium text-gray-500">
            {hint}
          </div>
        ) : null}
        <div className="mt-2 text-[11px] font-medium text-gray-700">
          {statusMessage}
        </div>
      </div>
    </li>
  );
}
