import { render, screen, fireEvent } from '@testing-library/react';
import GlobalError from '@/app/global-error';

const originalEnv = process.env.NODE_ENV;

describe('GlobalError component', () => {
  let windowLocationMock: { href: string };
  const originalLocation = window.location;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock window.location
    windowLocationMock = { href: '' };
    Object.defineProperty(window, 'location', {
      value: windowLocationMock,
      writable: true,
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    windowLocationMock.href = '';
  });

  it('renders error message and retry/home buttons', () => {
    const resetMock = jest.fn();
    const error = new Error('Test error message');

    render(<GlobalError error={error} reset={resetMock} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(/We hit an unexpected error while loading this page/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Go home/i }),
    ).toBeInTheDocument();
  });

  it('calls reset when retry button is clicked', () => {
    const resetMock = jest.fn();
    const error = new Error('Test error');

    render(<GlobalError error={error} reset={resetMock} />);

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(resetMock).toHaveBeenCalledTimes(1);
  });

  it('navigates to home when Go home button is clicked', () => {
    const resetMock = jest.fn();
    const error = new Error('Test error');

    render(<GlobalError error={error} reset={resetMock} />);

    fireEvent.click(screen.getByRole('button', { name: /Go home/i }));
    expect(windowLocationMock.href).toBe('/');
  });

  it('shows error digest in production mode when available', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
    });
    const resetMock = jest.fn();
    const error = Object.assign(new Error('Test error'), {
      digest: 'error-digest-123',
    });

    render(<GlobalError error={error} reset={resetMock} />);

    expect(screen.getByText(/Error id: error-digest-123/i)).toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true,
    });
  });

  it('shows error message in development mode', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      configurable: true,
    });
    const resetMock = jest.fn();
    const error = new Error('Detailed error message');

    render(<GlobalError error={error} reset={resetMock} />);

    expect(screen.getByText('Detailed error message')).toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true,
    });
  });

  it('handles error without digest in production mode', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
    });
    const resetMock = jest.fn();
    const error = new Error('Test error without digest');

    render(<GlobalError error={error} reset={resetMock} />);

    // Should not show any detail line when no digest
    expect(screen.queryByText(/Error id:/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText('Test error without digest'),
    ).not.toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true,
    });
  });
});
