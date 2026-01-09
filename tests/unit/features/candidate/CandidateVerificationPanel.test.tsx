import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandidateVerificationPanel } from '@/features/candidate/session/components/CandidateVerificationPanel';
import {
  confirmCandidateVerificationCode,
  sendCandidateVerificationCode,
} from '@/lib/api/candidate';

jest.mock('@/lib/api/candidate', () => ({
  sendCandidateVerificationCode: jest.fn(),
  confirmCandidateVerificationCode: jest.fn(),
}));

const sendMock = sendCandidateVerificationCode as jest.Mock;
const confirmMock = confirmCandidateVerificationCode as jest.Mock;

describe('CandidateVerificationPanel', () => {
  const waitForSend = async () => {
    await waitFor(() => expect(sendMock).toHaveBeenCalled());
  };

  beforeEach(() => {
    sendMock.mockReset();
    confirmMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends the verification code on mount and shows masked email', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitFor(() => expect(sendMock).toHaveBeenCalledWith('tok_123'));
    expect(await screen.findByText(/t\*\*\*@example.com/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Resend in 1:00/i }),
    ).toBeInTheDocument();
  });

  it('verifies the code and calls onVerified', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });
    confirmMock.mockResolvedValue({
      verified: true,
      candidateAccessToken: 'candidate-token',
      expiresAt: '2025-01-02T00:00:00Z',
    });
    const onVerified = jest.fn();

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={onVerified} />,
    );

    await waitForSend();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );

    fireEvent.paste(screen.getByLabelText('Verification code'), {
      clipboardData: {
        getData: () => '123456',
      },
    });

    await user.click(screen.getByRole('button', { name: /Verify code/i }));

    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledWith(
        'candidate-token',
        'user@example.com',
      ),
    );
  });

  it('surfaces lockout messaging on otp_locked', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });
    confirmMock.mockRejectedValue({ otpError: 'otp_locked' });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await user.click(screen.getByRole('button', { name: /Verify code/i }));

    expect(await screen.findByText(/Too many attempts/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 1')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Verify code/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Resend/i })).toBeDisabled();
  });

  it('shows send-limit messaging when the resend limit is hit', async () => {
    sendMock.mockRejectedValue({
      status: 429,
      otpError: 'otp_send_limit',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    expect(
      await screen.findByText(/requested too many codes/i),
    ).toBeInTheDocument();
  });

  it('surfaces invalid invite messaging on send errors', async () => {
    sendMock.mockRejectedValue({
      status: 404,
      message: 'That invite link is invalid.',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    expect(
      await screen.findByText(/invite link is invalid/i),
    ).toBeInTheDocument();
  });

  it('shows resend cooldown messaging for otp_cooldown', async () => {
    sendMock.mockRejectedValue({
      status: 429,
      otpError: 'otp_cooldown',
      retryAfterSeconds: 42,
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    expect(await screen.findByText(/already sent a code/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Resend in 0:42/i }),
    ).toBeInTheDocument();
  });

  it('does not auto-retry sending the code after an error', async () => {
    sendMock.mockRejectedValue({
      status: 404,
      message: 'That invite link is invalid.',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(/invite link is invalid/i),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );
    expect(sendMock).toHaveBeenCalledTimes(1);

    sendMock.mockResolvedValueOnce({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });
    await user.click(screen.getByRole('button', { name: /Resend code/i }));
    await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(2));
  });

  it('shows resend cooldown after manual resend errors', async () => {
    sendMock.mockResolvedValueOnce({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
      retryAfterSeconds: 0,
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    sendMock.mockRejectedValueOnce({
      status: 429,
      otpError: 'otp_cooldown',
      retryAfterSeconds: 10,
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Resend code/i }));

    expect(await screen.findByText(/already sent a code/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Resend in 0:10/i }),
    ).toBeInTheDocument();
  });

  it('counts down lockout duration and re-enables inputs', async () => {
    jest.useFakeTimers();
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });
    confirmMock.mockRejectedValue({
      otpError: 'otp_locked',
      retryAfterSeconds: 2,
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });
    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await user.click(screen.getByRole('button', { name: /Verify code/i }));

    expect(await screen.findByText(/Try again in 00:02/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 1')).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByLabelText('Digit 1')).not.toBeDisabled();
  });

  it('overwrites digits and clears trailing entries on multi-digit input', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      fireEvent.change(screen.getByLabelText(`Digit ${index + 1}`), {
        target: { value: digit },
      });
    }
    fireEvent.change(screen.getByLabelText('Digit 1'), {
      target: { value: '12' },
    });

    expect(screen.getByLabelText('Digit 1')).toHaveValue('1');
    expect(screen.getByLabelText('Digit 2')).toHaveValue('2');
    expect(screen.getByLabelText('Digit 3')).toHaveValue('');
    expect(screen.getByLabelText('Digit 4')).toHaveValue('');
    expect(screen.getByLabelText('Digit 5')).toHaveValue('');
    expect(screen.getByLabelText('Digit 6')).toHaveValue('');
  });

  it('moves focus with arrows and clears the current digit on backspace', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    const digit1 = screen.getByLabelText('Digit 1');
    const digit2 = screen.getByLabelText('Digit 2');

    fireEvent.change(digit2, { target: { value: '9' } });
    fireEvent.keyDown(digit2, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(digit1);

    fireEvent.keyDown(digit2, { key: 'Backspace' });
    expect(digit2).toHaveValue('');
  });

  it('pastes digits starting at the focused input and advances focus', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    const digit3 = screen.getByLabelText('Digit 3');
    const digit4 = screen.getByLabelText('Digit 4');
    const digit5 = screen.getByLabelText('Digit 5');
    const digit6 = screen.getByLabelText('Digit 6');

    digit3.focus();
    fireEvent.paste(digit3, {
      clipboardData: { getData: () => '89' },
    });

    expect(digit3).toHaveValue('8');
    expect(digit4).toHaveValue('9');
    expect(digit5).toHaveValue('');
    expect(digit6).toHaveValue('');
    expect(document.activeElement).toBe(digit5);
  });

  it('pastes a single digit into the focused input', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    const digit2 = screen.getByLabelText('Digit 2');
    const digit3 = screen.getByLabelText('Digit 3');

    digit2.focus();
    fireEvent.paste(digit2, {
      clipboardData: { getData: () => '7' },
    });

    expect(digit2).toHaveValue('7');
    expect(document.activeElement).toBe(digit3);
  });

  it('clears trailing digits when pasting mid-sequence', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      fireEvent.change(screen.getByLabelText(`Digit ${index + 1}`), {
        target: { value: digit },
      });
    }

    const digit3 = screen.getByLabelText('Digit 3');
    const digit4 = screen.getByLabelText('Digit 4');

    fireEvent.paste(digit3, {
      clipboardData: { getData: () => '89' },
    });

    expect(screen.getByLabelText('Digit 1')).toHaveValue('1');
    expect(screen.getByLabelText('Digit 2')).toHaveValue('2');
    expect(digit3).toHaveValue('8');
    expect(digit4).toHaveValue('9');
    expect(screen.getByLabelText('Digit 5')).toHaveValue('');
    expect(screen.getByLabelText('Digit 6')).toHaveValue('');
  });

  it('clears previous digit when backspacing on empty input', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Digit 1'), '1');
    await user.click(screen.getByLabelText('Digit 2'));
    await user.keyboard('{Backspace}');

    expect(screen.getByLabelText('Digit 1')).toHaveValue('');
    expect(screen.getByLabelText('Digit 2')).toHaveValue('');
  });

  it('disables verify until email and full code are present', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    const verifyButton = screen.getByRole('button', { name: /Verify code/i });
    expect(verifyButton).toBeDisabled();

    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );
    await user.type(screen.getByLabelText('Digit 1'), '1');
    expect(verifyButton).toBeDisabled();

    await user.type(screen.getByLabelText('Digit 2'), '2');
    await user.type(screen.getByLabelText('Digit 3'), '3');
    await user.type(screen.getByLabelText('Digit 4'), '4');
    await user.type(screen.getByLabelText('Digit 5'), '5');
    await user.type(screen.getByLabelText('Digit 6'), '6');
    expect(verifyButton).toBeEnabled();
  });

  it('updates resend countdown over time', async () => {
    jest.useFakeTimers();
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(sendMock).toHaveBeenCalled();

    expect(
      screen.getByRole('button', { name: /Resend in 1:00/i }),
    ).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(
      screen.getByRole('button', { name: /Resend in 0:58/i }),
    ).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('clears digits on otp_expired responses', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });
    confirmMock.mockRejectedValue({ otpError: 'otp_expired' });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await user.click(screen.getByRole('button', { name: /Verify code/i }));

    expect(await screen.findByText(/code expired/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Digit 1')).toHaveValue(''),
    );
  });

  it('renders a back button when onBack is provided', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });
    const onBack = jest.fn();

    render(
      <CandidateVerificationPanel
        token="tok_123"
        onVerified={jest.fn()}
        onBack={onBack}
      />,
    );

    await waitForSend();
    await userEvent.setup().click(
      await screen.findByRole('button', {
        name: /Back to Candidate Dashboard/i,
      }),
    );
    expect(onBack).toHaveBeenCalled();
  });

  it('validates missing email and incomplete code before submitting', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    const user = userEvent.setup();
    await waitForSend();
    await screen.findByText(/t\*\*\*@example.com/i);
    fireEvent.click(screen.getByRole('button', { name: /Verify code/i }));
    await waitFor(() => expect(confirmMock).not.toHaveBeenCalled());

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );
    await user.type(screen.getByLabelText('Digit 1'), '1');
    await user.click(screen.getByRole('button', { name: /Verify code/i }));
    await waitFor(() => expect(confirmMock).not.toHaveBeenCalled());
  });

  it('surfaces invalid otp messaging from the API', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });
    confirmMock.mockRejectedValue({ otpError: 'invalid_otp' });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await user.click(screen.getByRole('button', { name: /Verify code/i }));

    expect(await screen.findByText(/code doesn’t match/i)).toBeInTheDocument();
  });

  it('shows mismatch messaging when the email does not match', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });
    confirmMock.mockRejectedValue({ otpError: 'email_mismatch' });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await user.click(screen.getByRole('button', { name: /Verify code/i }));

    expect(await screen.findByText(/email doesn’t match/i)).toBeInTheDocument();
  });

  it('shows a fallback message when verification returns no token', async () => {
    sendMock.mockResolvedValue({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });
    confirmMock.mockResolvedValue({
      verified: true,
      candidateAccessToken: '',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    render(
      <CandidateVerificationPanel token="tok_123" onVerified={jest.fn()} />,
    );

    await waitForSend();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'user@example.com',
    );
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await user.click(screen.getByRole('button', { name: /Verify code/i }));

    expect(
      await screen.findByText(/Unable to verify that code right now/i),
    ).toBeInTheDocument();
  });
});
