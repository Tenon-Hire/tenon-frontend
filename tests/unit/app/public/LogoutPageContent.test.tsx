import { render, screen } from '@testing-library/react';
import LogoutPage from '@/features/auth/LogoutPage';

describe('LogoutPageContent', () => {
  it('renders logout and cancel actions', () => {
    render(<LogoutPage />);

    expect(screen.getByText('Log out')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Yes, log me out' }),
    ).toHaveAttribute(
      'href',
      '/auth/logout?returnTo=http%3A%2F%2Flocalhost%2F',
    );
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
