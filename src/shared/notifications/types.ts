'use client';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export type ToastAction = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

export type ToastInput = {
  id?: string;
  tone: ToastTone;
  title: string;
  description?: string;
  actions?: ToastAction[];
  durationMs?: number;
  sticky?: boolean;
};

export type ToastState = ToastInput & {
  id: string;
  createdAt: number;
  durationMs: number;
  sticky: boolean;
};

export type NotificationsContextValue = {
  notify: (toast: ToastInput) => void;
  dismiss: (id: string) => void;
  update: (id: string, patch: Partial<ToastInput>) => void;
};

export const DEFAULT_DURATION = 5200;
