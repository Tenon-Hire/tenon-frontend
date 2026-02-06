import { recruiterBffClient } from '@/lib/api/client';
import {
  getId,
  getNumber,
  getString,
  isRecord,
} from '@/lib/api/errors/utils/normalize';

export { recruiterBffClient, getId, getNumber, getString, isRecord };

export const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

export const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const safeId = (value: string | number | null | undefined) =>
  value == null ? '' : String(value).trim();
