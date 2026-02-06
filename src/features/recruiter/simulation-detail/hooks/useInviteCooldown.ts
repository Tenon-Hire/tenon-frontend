import { useCallback, useEffect, useRef } from 'react';
import { formatCooldown } from '../utils/formatters';
import type { RowState } from './types';

type UpdateRow = (id: string, next: (prev: RowState) => RowState) => void;

const COOLDOWN_FALLBACK_SECONDS = 30;

export function useInviteCooldown(updateRow: UpdateRow) {
  const intervalRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  return useCallback(
    (id: string, seconds?: number | null) => {
      clearTimer();
      const ms =
        (seconds && Number.isFinite(seconds)
          ? seconds
          : COOLDOWN_FALLBACK_SECONDS) * 1000;
      const untilMs = Date.now() + ms;
      updateRow(id, (p) => ({
        ...p,
        resending: false,
        cooldownUntilMs: untilMs,
        message: formatCooldown(ms),
      }));
      intervalRef.current = window.setInterval(() => {
        const remaining = untilMs - Date.now();
        if (remaining <= 0) {
          clearTimer();
          updateRow(id, (p) => ({
            ...p,
            cooldownUntilMs: null,
            message: null,
          }));
          return;
        }
        updateRow(id, (p) => ({
          ...p,
          cooldownUntilMs: untilMs,
          message: formatCooldown(remaining),
        }));
      }, 1000);
    },
    [clearTimer, updateRow],
  );
}
