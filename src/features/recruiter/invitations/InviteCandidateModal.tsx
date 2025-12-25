import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';

export type InviteUiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

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
  const [candidateName, setCandidateName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const nameInputId = 'invite-candidate-name';
  const emailInputId = 'invite-candidate-email';

  const openKey = open
    ? `${initialName ?? ''}::${initialEmail ?? ''}`
    : 'closed';

  useEffect(() => {
    if (!open) return;
    setCandidateName(initialName ?? '');
    setInviteEmail(initialEmail ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  const clientValidationError = useMemo(() => {
    if (!open) return null;
    if (!candidateName.trim()) return 'Candidate name is required.';
    if (!inviteEmail.trim()) return 'Candidate email is required.';
    return null;
  }, [open, candidateName, inviteEmail]);

  if (!open) return null;

  const disabled = state.status === 'loading';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={disabled ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Invite candidate</h3>
            <p className="mt-1 text-sm text-gray-600">{title}</p>
          </div>
          <button
            type="button"
            className="rounded p-2 text-gray-500 hover:bg-gray-100"
            onClick={disabled ? undefined : onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor={nameInputId}
              className="text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Candidate name
            </label>
            <input
              id={nameInputId}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Jane Doe"
              disabled={disabled}
            />
          </div>

          <div>
            <label
              htmlFor={emailInputId}
              className="text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Candidate email
            </label>
            <input
              id={emailInputId}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="jane@example.com"
              disabled={disabled}
            />
          </div>

          {clientValidationError ? (
            <div className="rounded border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{clientValidationError}</p>
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="rounded border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Invite failed</p>
              <p className="text-sm text-red-700">{state.message}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} disabled={disabled}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (clientValidationError) return;
              onSubmit(candidateName, inviteEmail);
            }}
            disabled={disabled || Boolean(clientValidationError)}
          >
            {state.status === 'loading' ? 'Creating…' : 'Create invite'}
          </Button>
        </div>
      </div>
    </div>
  );
}
