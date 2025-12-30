import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/(auth)/auth/login/page';

describe('LoginPage', () => {
  it('renders recruiter login heading and Auth0 button', () => {
    render(<LoginPage />);

    expect(screen.getByText('Recruiter login')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue with Auth0' }),
    ).toBeInTheDocument();
  });

  it('links to Auth0 with the dashboard return path', () => {
    render(<LoginPage />);

    const authLink = screen.getByRole('link', { name: 'Continue with Auth0' });

    expect(authLink).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fdashboard',
    );
  });
});
