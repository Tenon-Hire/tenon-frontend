import { render, screen } from '@testing-library/react';
import React from 'react';
import AppShell from '@/features/shared/layout/AppShell';
import { AppHeader } from '@/features/shared/layout/AppHeader';
import { AppNav } from '@/features/shared/layout/AppNav';
import { BRAND_NAME } from '@/lib/brand';

jest.mock('next/link', () => {
  function LinkMock({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return LinkMock;
});

jest.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: jest.fn(),
  },
  getSessionNormalized: jest.fn(),
  getCachedSessionNormalized: jest.fn(),
}));

const getSessionNormalizedMock = jest.requireMock('@/lib/auth0')
  .getCachedSessionNormalized as jest.Mock;

describe('shared layout components', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders AppNav links only when authed', () => {
    const { rerender } = render(<AppNav isAuthed={false} />);
    expect(screen.queryByText(/Dashboard/i)).toBeNull();

    rerender(<AppNav isAuthed />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });

  it('renders AppHeader with brand and nested nav', () => {
    render(<AppHeader isAuthed />);
    expect(screen.getByText(BRAND_NAME)).toBeInTheDocument();
    expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
  });

  it('renders AppShell with auth-driven header and children', async () => {
    getSessionNormalizedMock.mockResolvedValue({ user: { sub: 'abc' } });
    const element = await AppShell({ children: <div data-testid="child" /> });
    render(element);

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText(BRAND_NAME)).toBeInTheDocument();
    expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
  });
});
