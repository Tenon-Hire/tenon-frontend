import { DEFAULT_DURATION, type ToastInput, type ToastState } from '../types';

const safeId = () =>
  `toast-${Math.random().toString(16).slice(2)}-${Date.now()}`;

export const buildToast = (
  input: ToastInput,
  existing?: ToastState,
): ToastState => {
  const toastId = input.id ?? existing?.id ?? safeId();
  const duration =
    input.sticky === true
      ? 0
      : typeof input.durationMs === 'number'
        ? input.durationMs
        : (existing?.durationMs ?? DEFAULT_DURATION);

  return {
    ...existing,
    ...input,
    id: toastId,
    createdAt: existing?.createdAt ?? Date.now(),
    durationMs: duration,
    sticky: Boolean(input.sticky ?? existing?.sticky ?? false),
    actions: input.actions ?? existing?.actions ?? [],
  };
};
