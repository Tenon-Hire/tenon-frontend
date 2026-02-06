'use client';

import type { ToastState } from '../types';

const toneClasses = (tone: ToastState['tone']) => {
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
};

type Props = {
  toasts: ToastState[];
  dismiss: (id: string) => void;
};

export function ToastContainer({ toasts, dismiss }: Props) {
  return (
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
                        className={`rounded border border-current px-2 py-1 text-[11px] font-medium leading-tight hover:bg-white/40 ${action.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        disabled={action.disabled}
                        aria-disabled={action.disabled ? 'true' : undefined}
                        onClick={() => {
                          if (action.disabled) return;
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
  );
}
