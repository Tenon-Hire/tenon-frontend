'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

type ToastAction = {
  label: string;
  onClick?: () => void;
};

type ToastInput = {
  id?: string;
  tone: ToastTone;
  title: string;
  description?: string;
  actions?: ToastAction[];
  durationMs?: number;
  sticky?: boolean;
};

type ToastState = ToastInput & {
  id: string;
  createdAt: number;
  durationMs: number;
  sticky: boolean;
};

type NotificationsContextValue = {
  notify: (toast: ToastInput) => void;
  dismiss: (id: string) => void;
};

const DEFAULT_DURATION = 5200;

const NotificationsContext = createContext<NotificationsContextValue>({
  notify: () => {},
  dismiss: () => {},
});

function toneClasses(tone: ToastTone): string {
  switch (tone) {
    case 'success':
      return 'border-green-200 bg-green-50 text-green-900';
    case 'error':
      return 'border-red-200 bg-red-50 text-red-900';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-blue-200 bg-blue-50 text-blue-900';
  }
}

function safeId(): string {
  return `toast-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timersRef.current[id]) {
      window.clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const scheduleDismiss = useCallback(
    (toast: ToastState) => {
      if (toast.sticky || toast.durationMs <= 0) return;
      if (timersRef.current[toast.id]) {
        window.clearTimeout(timersRef.current[toast.id]);
      }
      timersRef.current[toast.id] = window.setTimeout(() => {
        dismiss(toast.id);
      }, toast.durationMs);
    },
    [dismiss],
  );

  const notify = useCallback(
    (input: ToastInput) => {
      const toastId = input.id ?? safeId();
      const duration =
        input.sticky === true
          ? 0
          : typeof input.durationMs === 'number'
            ? input.durationMs
            : DEFAULT_DURATION;

      setToasts((prev) => {
        const existingIdx = prev.findIndex((t) => t.id === toastId);
        const nextToast: ToastState = {
          ...prev[existingIdx],
          ...input,
          id: toastId,
          createdAt: Date.now(),
          durationMs: duration,
          sticky: Boolean(input.sticky),
          actions: input.actions ?? prev[existingIdx]?.actions ?? [],
        };
        const next =
          existingIdx >= 0
            ? prev.map((t, idx) => (idx === existingIdx ? nextToast : t))
            : [...prev, nextToast];

        return next;
      });

      scheduleDismiss({
        ...input,
        id: toastId,
        createdAt: Date.now(),
        durationMs: duration,
        sticky: Boolean(input.sticky),
      });
    },
    [scheduleDismiss],
  );

  const value = useMemo(
    () => ({
      notify,
      dismiss,
    }),
    [dismiss, notify],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-end px-4 sm:px-6">
        <div className="flex w-full max-w-md flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded border shadow-sm ${toneClasses(toast.tone)}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold leading-tight">
                    {toast.title}
                  </div>
                  {toast.description ? (
                    <div className="text-xs leading-relaxed text-black/70">
                      {toast.description}
                    </div>
                  ) : null}
                  {toast.actions && toast.actions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {toast.actions.map((action, idx) => (
                        <button
                          key={`${toast.id}-action-${idx}`}
                          type="button"
                          className="rounded border border-current px-2 py-1 text-[11px] font-medium leading-tight hover:bg-white/40"
                          onClick={() => {
                            action.onClick?.();
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  className="rounded p-1 text-sm font-semibold leading-none hover:bg-black/5"
                  onClick={() => dismiss(toast.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </NotificationsContext.Provider>
  );
}
