import { statusMeta } from '@/features/shared/status/statusMeta';
import type { DayStatus } from './daySummaries';

const STATUS_KEY: Record<DayStatus, string> = {
  completed: 'completed',
  current: 'in_progress',
  locked: 'locked',
};

const statusMessage = (status: DayStatus, dayIndex: number) => {
  if (status === 'completed') return 'Done';
  if (status === 'current') return 'You are here';
  return `Complete Day ${Math.max(dayIndex - 1, 1)} first.`;
};

export const dayStatusMeta = (status: DayStatus, dayIndex: number) => {
  const meta = statusMeta(STATUS_KEY[status], 'Locked');
  return {
    label: meta.label,
    tone: meta.tone,
    message: statusMessage(status, dayIndex),
  };
};
