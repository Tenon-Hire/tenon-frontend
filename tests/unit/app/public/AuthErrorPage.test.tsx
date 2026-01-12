import { render, screen } from '@testing-library/react';
import AuthErrorPage from '@/features/auth/AuthErrorPage';

describe('AuthErrorPage', () => {
  it('renders retry and clear actions with returnTo', () => {
    render(
      <AuthErrorPage
        returnTo="/dashboard"
        mode="recruiter"
        errorCode="invalid_state"
        errorId="trace-123"
      />,
    );

    const retry = screen.getByRole('link', { name: 'Retry sign-in' });
    expect(retry).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fdashboard&mode=recruiter',
    );
    const clear = screen.getByRole('link', { name: 'Clear auth state' });
    expect(clear).toHaveAttribute(
      'href',
      '/auth/clear?returnTo=%2Fdashboard&mode=recruiter',
    );
    expect(screen.getByText(/Code: invalid_state/i)).toBeInTheDocument();
    expect(screen.getByText(/Trace ID: trace-123/i)).toBeInTheDocument();
  });

  it('shows cleared state notice', () => {
    render(<AuthErrorPage returnTo="/dashboard" cleared />);
    expect(
      screen.getByText(/Auth state cleared/i),
    ).toBeInTheDocument();
  });
});
