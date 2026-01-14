import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InviteCandidateModal } from '@/features/recruiter/invitations/InviteCandidateModal';

describe('InviteCandidateModal', () => {
  it('passes string values to submit handler', () => {
    const onSubmit = jest.fn();
    render(
      <InviteCandidateModal
        open
        title="Test Simulation"
        state={{ status: 'idle' }}
        onClose={() => undefined}
        onSubmit={onSubmit}
        initialName=""
        initialEmail=""
      />,
    );

    fireEvent.change(screen.getByLabelText(/Candidate name/i), {
      target: { value: '  Jane Doe  ' },
    });
    fireEvent.change(screen.getByLabelText(/Candidate email/i), {
      target: { value: '  JANE@EXAMPLE.COM  ' },
    });

    fireEvent.click(screen.getByText('Send invite'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [name, email] = onSubmit.mock.calls[0] as [unknown, unknown];
    expect(typeof name).toBe('string');
    expect(typeof email).toBe('string');
    expect(name).toBe('  Jane Doe  ');
    expect(email).toBe('  JANE@EXAMPLE.COM  ');
  });

  it('hydrates initial values when opened', async () => {
    const { rerender } = render(
      <InviteCandidateModal
        open={false}
        title="Test Simulation"
        state={{ status: 'idle' }}
        onClose={() => undefined}
        onSubmit={() => undefined}
        initialName=""
        initialEmail=""
      />,
    );

    rerender(
      <InviteCandidateModal
        open
        title="Test Simulation"
        state={{ status: 'idle' }}
        onClose={() => undefined}
        onSubmit={() => undefined}
        initialName="Ada Lovelace"
        initialEmail="ada@example.com"
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Candidate name/i)).toHaveValue(
        'Ada Lovelace',
      );
      expect(screen.getByLabelText(/Candidate email/i)).toHaveValue(
        'ada@example.com',
      );
    });
  });

  it('blocks submit when candidate name is missing', () => {
    const onSubmit = jest.fn();
    render(
      <InviteCandidateModal
        open
        title="Test Simulation"
        state={{ status: 'idle' }}
        onClose={() => undefined}
        onSubmit={onSubmit}
        initialName=""
        initialEmail=""
      />,
    );

    fireEvent.change(screen.getByLabelText(/Candidate email/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.click(screen.getByText('Send invite'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Candidate name is required/i)).toBeInTheDocument();
  });
});
