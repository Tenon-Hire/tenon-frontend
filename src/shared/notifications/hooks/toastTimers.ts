import type { MutableRefObject } from 'react';
import type { ToastState } from '../types';

type TimerRegistry = MutableRefObject<Record<string, number>>;

export const setToastTimer = (
  timersRef: TimerRegistry,
  toast: ToastState,
  dismiss: (id: string) => void,
) => {
  if (toast.sticky || toast.durationMs <= 0) return;
  const existing = timersRef.current[toast.id];
  if (existing) window.clearTimeout(existing);
  timersRef.current[toast.id] = window.setTimeout(
    () => dismiss(toast.id),
    toast.durationMs,
  );
};

export const clearToastTimer = (timersRef: TimerRegistry, id: string): void => {
  const existing = timersRef.current[id];
  if (existing) {
    window.clearTimeout(existing);
    delete timersRef.current[id];
  }
};

export const clearAllTimers = (timersRef: TimerRegistry): void => {
  Object.values(timersRef.current).forEach((timerId) =>
    window.clearTimeout(timerId),
  );
  timersRef.current = {};
};
