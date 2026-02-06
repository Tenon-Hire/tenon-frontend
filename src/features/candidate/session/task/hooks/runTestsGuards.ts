import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';

export type RunGuards = {
  locked: MutableRefObject<boolean>;
  pending: MutableRefObject<{ attempt: number; runId: string } | null>;
  startedAt: MutableRefObject<number | null>;
  reset: () => void;
};

export const useRunGuards = (): RunGuards => {
  const locked = useRef(false);
  const pending = useRef<{ attempt: number; runId: string } | null>(null);
  const startedAt = useRef<number | null>(null);

  const reset = useCallback(() => {
    locked.current = false;
    pending.current = null;
    startedAt.current = null;
  }, []);

  return { locked, pending, startedAt, reset };
};
