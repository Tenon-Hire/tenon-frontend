import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from './page';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renders recruiter login heading and Auth0 button', () => {
    render(<LoginPage />);

    expect(screen.getByText('Recruiter login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Auth0' })).toBeInTheDocument();
  });

  it('navigates to Auth0 login when button is clicked', () => {
    render(<LoginPage />);

    const button = screen.getByRole('button', { name: 'Continue with Auth0' });
    fireEvent.click(button);

    expect(pushMock).toHaveBeenCalledWith('/auth/login');
  });
});
