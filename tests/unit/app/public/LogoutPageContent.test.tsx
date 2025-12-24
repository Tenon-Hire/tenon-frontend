import { render, screen } from '@testing-library/react';
import LogoutPageContent from '@/app/(public)/logout/LogoutPageContent';

describe('LogoutPageContent', () => {
  it('renders logout and cancel actions', () => {
    render(<LogoutPageContent />);

    expect(screen.getByText('Log out')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Yes, log me out' })).toHaveAttribute('href', '/auth/logout');
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/dashboard');
  });
});
