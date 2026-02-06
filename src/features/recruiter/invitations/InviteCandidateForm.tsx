import { useState } from 'react';
import Button from '@/components/ui/Button';
import { InviteInputField } from './InviteInputField';
import type { InviteUiState } from './InviteCandidateModal';

type Props = {
  initialName?: string;
  initialEmail?: string;
  state: InviteUiState;
  onSubmit: (name: string, email: string) => void;
  onCancel: () => void;
};

export function InviteCandidateForm({
  initialName = '',
  initialEmail = '',
  state,
  onSubmit,
  onCancel,
}: Props) {
  const [candidateName, setCandidateName] = useState(initialName);
  const [inviteEmail, setInviteEmail] = useState(initialEmail);
  const normalizedEmail = inviteEmail.trim().toLowerCase();
  const clientValidationError = !inviteEmail.trim()
    ? 'Candidate email is required.'
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ? candidateName.trim()
        ? null
        : 'Candidate name is required.'
      : 'Enter a valid email address.';

  const disabled = state.status === 'loading';
  const submitDisabled = disabled || Boolean(clientValidationError);
  const primaryLabel =
    state.status === 'loading'
      ? 'Sending…'
      : state.status === 'success'
        ? 'Sent'
        : 'Send invite';

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!clientValidationError) onSubmit(candidateName, inviteEmail);
      }}
    >
      <InviteInputField
        id="invite-candidate-name"
        label="Candidate name"
        value={candidateName}
        onChange={setCandidateName}
        placeholder="Jane Doe"
        disabled={disabled}
      />

      <InviteInputField
        id="invite-candidate-email"
        label="Candidate email"
        value={inviteEmail}
        onChange={setInviteEmail}
        placeholder="jane@example.com"
        disabled={disabled}
        autoFocus
      />

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

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onCancel} disabled={disabled} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={submitDisabled}>
          {primaryLabel}
        </Button>
      </div>
    </form>
  );
}
