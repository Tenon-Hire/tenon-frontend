import { waitFor } from '@testing-library/react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  InviteToast,
  type ToastState,
} from '@/features/recruiter/invitations/InviteToast';
import { copyToClipboard } from '@/features/recruiter/utils/formatters';

jest.mock('@/features/recruiter/utils/formatters', () => ({
  __esModule: true,
  copyToClipboard: jest.fn().mockResolvedValue(true),
}));

function renderToast(overrides: Partial<ToastState> = {}) {
  const toast: ToastState =
    overrides.open === false || overrides.open === undefined
      ? { open: false }
      : ({
          open: true,
          kind: 'success',
          message: 'ok',
          inviteUrl: '',
        } as ToastState);

  const onDismiss = jest.fn();
  const onCopyStateChange = jest.fn();

  render(
    <InviteToast
      toast={{ ...toast, ...overrides } as ToastState}
      copied={false}
      onDismiss={onDismiss}
      onCopyStateChange={onCopyStateChange}
    />,
  );

  return { onDismiss, onCopyStateChange };
}

describe('InviteToast', () => {
  it('renders nothing when closed', () => {
    render(
      <InviteToast
        toast={{ open: false }}
        copied={false}
        onDismiss={() => {}}
        onCopyStateChange={() => {}}
      />,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders success toast with invite url and copy button', async () => {
    const { onCopyStateChange, onDismiss } = renderToast({
      open: true,
      kind: 'success',
      message: 'Invite created',
      inviteUrl: 'http://example.com/invite',
    });

    expect(screen.getByText('Invite created')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('http://example.com/invite'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));
    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith('http://example.com/invite');
      expect(onCopyStateChange).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders error toast without invite url', () => {
    renderToast({
      open: true,
      kind: 'error',
      message: 'Invite failed',
      inviteUrl: undefined,
    });

    expect(screen.getByText('Invite failed')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/http/)).toBeNull();
  });
});
