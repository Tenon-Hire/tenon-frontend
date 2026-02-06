import { InviteCandidateForm } from './InviteCandidateForm';

export type InviteUiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; message?: string };

type InviteCandidateModalProps = {
  open: boolean;
  title: string;
  initialName?: string;
  initialEmail?: string;
  state: InviteUiState;
  onClose: () => void;
  onSubmit: (candidateName: string, inviteEmail: string) => void;
};

export function InviteCandidateModal({
  open,
  title,
  initialName,
  initialEmail,
  state,
  onClose,
  onSubmit,
}: InviteCandidateModalProps) {
  if (!open) return null;

  const resetKey = `${initialName ?? ''}::${initialEmail ?? ''}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Invite candidate</h3>
            <p className="mt-1 text-sm text-gray-600">{title}</p>
          </div>
          <button
            type="button"
            className="rounded p-2 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <InviteCandidateForm
          key={resetKey}
          initialName={initialName}
          initialEmail={initialEmail}
          state={state}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
