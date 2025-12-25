import { render, screen } from '@testing-library/react';
import HomePageView from '@/features/public/home/HomePageView';

describe('PublicHomeContent', () => {
  it('shows signed-in state with user links', () => {
    render(<HomePageView user={{ name: 'Ada Lovelace' }} />);

    expect(screen.getByText('Welcome back, Ada Lovelace.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to dashboard' }),
    ).toHaveAttribute('href', '/dashboard');
    expect(
      screen.getByRole('link', { name: 'Open candidate simulation (demo)' }),
    ).toHaveAttribute('href', '/candidate/demo-token');
    expect(screen.getByRole('link', { name: 'Logout' })).toHaveAttribute(
      'href',
      '/logout',
    );
  });

  it('shows signed-out state with auth entry points', () => {
    render(<HomePageView />);

    expect(screen.getByText('Welcome to SimuHire')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Recruiter login' }),
    ).toHaveAttribute('href', '/auth/login?returnTo=%2Fdashboard');
    expect(
      screen.getByRole('link', { name: 'Candidate portal' }),
    ).toHaveAttribute('href', '/auth/login?returnTo=%2Fcandidate%2Fdemo-token');
  });

  it('handles user without a name gracefully', () => {
    render(<HomePageView user={{ name: null }} />);

    expect(screen.getByText('Welcome back.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to dashboard' }),
    ).toHaveAttribute('href', '/dashboard');
  });
});
