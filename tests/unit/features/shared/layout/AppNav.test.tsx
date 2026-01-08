import { render, screen } from '@testing-library/react';
import { AppNav } from '@/features/shared/layout/AppNav';
import { MarketingHomeSignedIn } from '@/features/marketing/home/MarketingHomeSignedIn';
import { MarketingHomeSignedOut } from '@/features/marketing/home/MarketingHomeSignedOut';

describe('auth navigation links', () => {
  it('renders logout as an anchor in the app nav', () => {
    render(<AppNav isAuthed permissions={['recruiter:access']} />);
    const logout = screen.getByText('Logout');
    expect(logout.tagName).toBe('A');
    expect(logout).toHaveAttribute('href', '/auth/logout');
  });

  it('renders logout as an anchor in the marketing signed-in view', () => {
    render(<MarketingHomeSignedIn name="Tester" />);
    const logout = screen.getByText('Logout');
    expect(logout.tagName).toBe('A');
    expect(logout).toHaveAttribute('href', '/auth/logout');
  });

  it('renders login CTA as an anchor in the marketing signed-out view', () => {
    render(<MarketingHomeSignedOut />);
    const recruiterLogin = screen.getByText('Recruiter login');
    expect(recruiterLogin.tagName).toBe('A');
    expect(recruiterLogin.getAttribute('href') || '').toContain('/auth/login');
  });
});
