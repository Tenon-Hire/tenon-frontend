'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type NotificationsContextValue,
  type ToastInput,
  type ToastState,
} from '../types';
import { buildToast } from './toastBuilders';
import { clearAllTimers, clearToastTimer, setToastTimer } from './toastTimers';

export function useToastQueue(): NotificationsContextValue & {
  toasts: ToastState[];
} {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    clearToastTimer(timersRef, id);
  }, []);

  const schedule = useCallback(
    (toast: ToastState) => setToastTimer(timersRef, toast, dismiss),
    [dismiss],
  );

  const notify = useCallback(
    (input: ToastInput) => {
      let nextToast: ToastState | null = null;
      setToasts((prev) => {
        const idx = input.id ? prev.findIndex((t) => t.id === input.id) : -1;
        const existing = idx >= 0 ? prev[idx] : undefined;
        const built = buildToast(input, existing);
        nextToast = built;
        if (idx >= 0) {
          const list = [...prev];
          list[idx] = built;
          return list;
        }
        return [...prev, built];
      });
      if (nextToast) schedule(nextToast);
    },
    [schedule],
  );

  const update = useCallback(
    (id: string, patch: Partial<ToastInput>) => {
      let updated: ToastState | null = null;
      setToasts((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        if (idx === -1) return prev;
        const next = buildToast({ ...prev[idx], ...patch, id }, prev[idx]);
        updated = next;
        const list = [...prev];
        list[idx] = next;
        return list;
      });
      if (updated) schedule(updated);
    },
    [schedule],
  );

  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.sticky || toast.durationMs <= 0) return;
      setToastTimer(timersRef, toast, dismiss);
    });
    return () => clearAllTimers(timersRef);
  }, [dismiss, toasts]);

  return { toasts, notify, dismiss, update };
}
