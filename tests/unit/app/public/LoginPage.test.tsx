import { render, screen } from '@testing-library/react';
import LoginPage from '@/features/auth/LoginPage';

describe('LoginPage', () => {
  it('renders recruiter login heading and Auth0 button', () => {
    render(<LoginPage returnTo="/dashboard" />);

    expect(screen.getByText(/Recruiter login/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue with Auth0' }),
    ).toBeInTheDocument();
  });

  it('links to Auth0 with the dashboard return path', () => {
    render(<LoginPage returnTo="/dashboard" />);

    const authLink = screen.getByRole('link', { name: 'Continue with Auth0' });

    expect(authLink).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fdashboard&mode=recruiter',
    );
  });

  it('renders candidate-friendly copy when returnTo targets candidate session', () => {
    render(<LoginPage returnTo="/candidate/session/tok_123" />);

    expect(
      screen.getByText(/Sign in to continue your simulation/i),
    ).toBeInTheDocument();
    const authLink = screen.getByRole('link', { name: 'Continue with Auth0' });
    expect(authLink).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fcandidate%2Fsession%2Ftok_123&mode=candidate',
    );
  });

  it('still treats legacy candidate-sessions returnTo as candidate mode', () => {
    render(<LoginPage returnTo="/candidate-sessions/tok_legacy" />);

    const authLink = screen.getByRole('link', { name: 'Continue with Auth0' });
    expect(authLink).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fcandidate-sessions%2Ftok_legacy&mode=candidate',
    );
  });
});
