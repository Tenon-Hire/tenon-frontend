import { fireEvent, render, screen } from '@testing-library/react';
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

    fireEvent.click(screen.getByText('Create invite'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [name, email] = onSubmit.mock.calls[0] as [unknown, unknown];
    expect(typeof name).toBe('string');
    expect(typeof email).toBe('string');
    expect(name).toBe('  Jane Doe  ');
    expect(email).toBe('  JANE@EXAMPLE.COM  ');
  });
});
