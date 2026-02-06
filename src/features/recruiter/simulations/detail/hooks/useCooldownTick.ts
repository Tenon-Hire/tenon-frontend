'use client';
import type { RowState } from './types';
import { useCountdownTicker } from '@/shared/hooks/useCountdownTicker';

export function useCooldownTick(rowStates: Record<string, RowState>) {
  const predicate = () =>
    Object.values(rowStates).some(
      (row) =>
        typeof row.cooldownUntilMs === 'number' &&
        row.cooldownUntilMs > Date.now(),
    );

  return useCountdownTicker(predicate, 1000);
}
