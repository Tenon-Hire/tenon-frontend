import { render, screen } from '@testing-library/react';
import LoginPage from './page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: () => Promise.resolve(),
  }),
}));

describe('LoginPage', () => {
  it('renders login heading and form fields', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', { name: /recruiter login/i })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/work email/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/password/i)
    ).toBeInTheDocument();
  });
});
