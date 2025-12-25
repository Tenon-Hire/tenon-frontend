import { render, screen } from '@testing-library/react';
import LogoutPage from '@/features/auth/LogoutPage';

describe('LogoutPageContent', () => {
  it('renders logout and cancel actions', () => {
    render(<LogoutPage />);

    expect(screen.getByText('Log out')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Yes, log me out' }),
    ).toHaveAttribute('href', '/auth/logout');
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
