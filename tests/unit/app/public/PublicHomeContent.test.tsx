import { render, screen } from '@testing-library/react';
import MarketingHomePage from '@/features/marketing/home/MarketingHomePage';
import { BRAND_NAME } from '@/lib/brand';

describe('PublicHomeContent', () => {
  it('shows signed-in state with user links', () => {
    render(<MarketingHomePage user={{ name: 'Ada Lovelace' }} />);

    expect(screen.getByText('Welcome back, Ada Lovelace.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to dashboard' }),
    ).toHaveAttribute('href', '/dashboard');
    expect(
      screen.getByRole('link', { name: 'Candidate portal' }),
    ).toHaveAttribute('href', '/candidate/dashboard');
    expect(screen.getByRole('link', { name: 'Logout' })).toHaveAttribute(
      'href',
      '/auth/logout',
    );
  });

  it('shows signed-out state with auth entry points', () => {
    render(<MarketingHomePage />);

    expect(screen.getByText(`Welcome to ${BRAND_NAME}`)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Recruiter login' }),
    ).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fdashboard&mode=recruiter',
    );
    expect(
      screen.getByRole('link', { name: 'Candidate portal' }),
    ).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fcandidate%2Fdashboard&mode=candidate',
    );
  });

  it('handles user without a name gracefully', () => {
    render(<MarketingHomePage user={{ name: null }} />);

    expect(screen.getByText('Welcome back.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to dashboard' }),
    ).toHaveAttribute('href', '/dashboard');
  });
});
