import { toNumberOrNull, toStringOrNull } from './base';
import type { CandidateTask } from './types';

export const normalizeTask = (raw: unknown): CandidateTask | null => {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const id = toNumberOrNull(rec.id);
  const dayIndex = toNumberOrNull(rec.dayIndex ?? rec.day_index);
  const title = toStringOrNull(rec.title) ?? 'Task';
  const description = toStringOrNull(rec.description) ?? '';
  const type = toStringOrNull(rec.type) ?? 'code';
  if (id === null || dayIndex === null) return null;
  return { id, dayIndex, title, description, type };
};
