/**
 * Additional tests for AuthErrorPage to close coverage gaps
 */
import { render, screen } from '@testing-library/react';
import AuthErrorPage from '@/features/auth/AuthErrorPage';

describe('AuthErrorPage additional coverage', () => {
  it('renders default error message when no errorCode', () => {
    render(<AuthErrorPage />);
    expect(
      screen.getByText(/We could not complete your sign-in/i),
    ).toBeInTheDocument();
    // No code or trace ID shown when not provided
    expect(screen.queryByText(/Code:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Trace ID:/)).not.toBeInTheDocument();
  });

  it('renders state-related error message', () => {
    render(<AuthErrorPage errorCode="invalid_state" />);
    expect(
      screen.getByText(/Your sign-in session expired or was interrupted/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Code: invalid_state/)).toBeInTheDocument();
  });

  it('renders state-related error message (case insensitive)', () => {
    render(<AuthErrorPage errorCode="INVALID_STATE_ERROR" />);
    expect(
      screen.getByText(/Your sign-in session expired or was interrupted/i),
    ).toBeInTheDocument();
  });

  it('renders nonce-related error message', () => {
    render(<AuthErrorPage errorCode="nonce_mismatch" />);
    expect(
      screen.getByText(/We could not verify your sign-in session/i),
    ).toBeInTheDocument();
  });

  it('renders nonce-related error message (case insensitive)', () => {
    render(<AuthErrorPage errorCode="NONCE_INVALID" />);
    expect(
      screen.getByText(/We could not verify your sign-in session/i),
    ).toBeInTheDocument();
  });

  it('renders default error message for unknown error code', () => {
    render(<AuthErrorPage errorCode="some_unknown_error" />);
    expect(
      screen.getByText(/We could not complete your sign-in/i),
    ).toBeInTheDocument();
  });

  it('uses error prop when errorCode is null', () => {
    render(<AuthErrorPage error="state_expired" errorCode={null} />);
    expect(
      screen.getByText(/Your sign-in session expired or was interrupted/i),
    ).toBeInTheDocument();
  });

  it('shows errorId when provided', () => {
    render(<AuthErrorPage errorId="trace-abc-123" />);
    expect(screen.getByText(/Trace ID: trace-abc-123/)).toBeInTheDocument();
  });

  it('does not show cleared state notice when cleared is false', () => {
    render(<AuthErrorPage cleared={false} />);
    expect(screen.queryByText(/Auth state cleared/i)).not.toBeInTheDocument();
  });

  it('does not show cleared state notice when cleared is undefined', () => {
    render(<AuthErrorPage />);
    expect(screen.queryByText(/Auth state cleared/i)).not.toBeInTheDocument();
  });

  it('renders with candidate mode', () => {
    render(<AuthErrorPage mode="candidate" returnTo="/candidate/dashboard" />);
    const retry = screen.getByRole('link', { name: 'Retry sign-in' });
    expect(retry).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fcandidate%2Fdashboard&mode=candidate',
    );
  });

  it('renders without returnTo or mode', () => {
    render(<AuthErrorPage />);
    const retry = screen.getByRole('link', { name: 'Retry sign-in' });
    // LoginLink builds href based on its own logic
    expect(retry).toHaveAttribute('href');
  });

  it('renders with only returnTo', () => {
    render(<AuthErrorPage returnTo="/foo" />);
    const retry = screen.getByRole('link', { name: 'Retry sign-in' });
    expect(retry.getAttribute('href')).toContain('returnTo=%2Ffoo');
  });

  it('renders with only mode', () => {
    render(<AuthErrorPage mode="recruiter" />);
    const retry = screen.getByRole('link', { name: 'Retry sign-in' });
    expect(retry.getAttribute('href')).toContain('mode=recruiter');
  });

  it('renders title correctly', () => {
    render(<AuthErrorPage />);
    expect(screen.getByText('Sign-in failed')).toBeInTheDocument();
  });
});
