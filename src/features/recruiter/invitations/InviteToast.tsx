import Button from '@/components/ui/Button';
import { copyToClipboard } from '../utils/formatters';

export type ToastState =
  | { open: false }
  | {
      open: true;
      kind: 'success' | 'error';
      message: string;
      inviteUrl?: string;
    };

type InviteToastProps = {
  toast: ToastState;
  copied: boolean;
  onDismiss: () => void;
  onCopyStateChange: (next: boolean) => void;
};

export function InviteToast({
  toast,
  copied,
  onDismiss,
  onCopyStateChange,
}: InviteToastProps) {
  if (!toast.open) return null;

  const inviteUrl = toast.kind === 'success' ? toast.inviteUrl : undefined;

  return (
    <div
      className={
        toast.kind === 'success'
          ? 'rounded border border-green-200 bg-green-50 p-3'
          : 'rounded border border-red-200 bg-red-50 p-3'
      }
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-full">
          <p
            className={
              toast.kind === 'success'
                ? 'text-sm text-green-800'
                : 'text-sm text-red-800'
            }
          >
            {toast.message}
          </p>

          {inviteUrl ? (
            <div className="mt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-green-800/80">
                Invite URL
              </p>
              <div className="mt-1 flex items-stretch gap-2">
                <input
                  className="w-full rounded border border-green-200 bg-white px-3 py-2 font-mono text-xs"
                  readOnly
                  value={inviteUrl}
                  aria-label="Invite URL"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(inviteUrl);
                    onCopyStateChange(ok);
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-black/5"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
