import { render, screen } from '@testing-library/react';
import LogoutPage from '@/features/auth/LogoutPage';

describe('LogoutPageContent', () => {
  it('renders logout and cancel actions', () => {
    render(<LogoutPage />);

    expect(screen.getByText('Log out')).toBeInTheDocument();
    const logout = screen.getByRole('link', { name: 'Yes, log me out' });
    const url = new URL(
      logout.getAttribute('href') ?? '',
      window.location.origin,
    );
    expect(url.searchParams.get('returnTo')).toBe(
      new URL('/', window.location.origin).toString(),
    );
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
