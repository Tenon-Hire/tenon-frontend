import { render, screen } from '@testing-library/react';
import RecruiterDashboardContent, { RecruiterProfile } from './RecruiterDashboardContent';

describe('RecruiterDashboardContent', () => {
  const profile: RecruiterProfile = {
    id: 1,
    name: 'Jordan Doe',
    email: 'jordan@example.com',
    role: 'recruiter',
  };

  it('renders profile details when available', () => {
    render(<RecruiterDashboardContent profile={profile} error={null} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Jordan Doe')).toBeInTheDocument();
    expect(screen.getByText('jordan@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Role:/)).toHaveTextContent('Role: recruiter');
  });

  it('shows an error message when provided', () => {
    render(<RecruiterDashboardContent profile={null} error="Unable to fetch profile" />);

    expect(screen.getByText('Unable to fetch profile')).toBeInTheDocument();
  });

  it('shows empty state when no profile or error', () => {
    render(<RecruiterDashboardContent profile={null} error={null} />);

    expect(screen.getByText('No profile data available.')).toBeInTheDocument();
  });
});
