import { render, screen } from '@testing-library/react';
import LoginPage from '@/features/auth/LoginPage';

describe('LoginPage', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('renders recruiter login by default', () => {
    render(<LoginPage />);

    expect(
      screen.getByText(/Recruiter login/i, { selector: 'h1,h2,h3' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/access your .* dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/Create your account/)).toBeNull();
  });

  it('renders candidate mode with signup link and warning when connection missing', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION = '';

    render(<LoginPage returnTo="/candidate/session/abc" mode="candidate" />);

    expect(
      screen.getByText(/Sign in to continue your simulation/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Dev warning: set NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/New candidate\? Create your account/i),
    ).toHaveAttribute(
      'href',
      expect.stringContaining(
        '/auth/login?returnTo=%2Fcandidate%2Fsession%2Fabc',
      ),
    );
  });

  it('uses recruiter mode when returnTo is recruiter dashboard', () => {
    render(<LoginPage returnTo="/dashboard" mode="recruiter" />);

    expect(
      screen.queryByText(
        /Dev warning: set NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION/i,
      ),
    ).toBeNull();
    expect(screen.getByText(/Recruiter login/i)).toBeInTheDocument();
  });
});
