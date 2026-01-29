import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SimulationCreatePage from '@/features/recruiter/simulations/SimulationCreatePage';

const createSimulationMock = jest.fn();
const pushMock = jest.fn();
const assignMock = jest.fn();
const originalLocation = window.location;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/lib/api/recruiter', () => ({
  createSimulation: (...args: unknown[]) => createSimulationMock(...args),
}));

jest.mock('@/lib/auth/routing', () => {
  const actual = jest.requireActual('@/lib/auth/routing');
  return {
    ...actual,
    buildLoginUrl: jest.fn(() => '/auth/login?returnTo=%2F'),
    buildNotAuthorizedUrl: jest.fn(() => '/not-authorized'),
    buildReturnTo: jest.fn(() => '/return'),
  };
});

jest.mock('@/lib/utils/errors', () => {
  const actual = jest.requireActual('@/lib/utils/errors');
  return {
    ...actual,
    toUserMessage: jest.fn(() => 'pretty error'),
  };
});

describe('SimulationCreatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, assign: assignMock },
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', { value: originalLocation });
  });

  const fillForm = () => {
    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: 'Title' },
    });
    fireEvent.change(screen.getByLabelText(/^Role/i), {
      target: { value: 'Role' },
    });
    fireEvent.change(screen.getByLabelText(/Tech stack/i), {
      target: { value: 'Stack' },
    });
  };

  it('validates required fields', async () => {
    render(<SimulationCreatePage />);
    fireEvent.click(screen.getByRole('button', { name: /Create simulation/i }));
    expect(await screen.findByText(/Title is required/i)).toBeInTheDocument();
  });

  it('handles backend auth redirects and 403', async () => {
    render(<SimulationCreatePage />);
    fillForm();
    createSimulationMock.mockResolvedValue({ ok: false, status: 401 });
    fireEvent.click(screen.getByRole('button', { name: /Create simulation/i }));
    await waitFor(() =>
      expect(createSimulationMock).toHaveBeenCalled(),
    );

    createSimulationMock.mockResolvedValue({ ok: false, status: 403 });
    fireEvent.click(screen.getByRole('button', { name: /Create simulation/i }));
    await waitFor(() =>
      expect(createSimulationMock).toHaveBeenCalledTimes(2),
    );
  });

  it('shows form error when backend returns message', async () => {
    render(<SimulationCreatePage />);
    fillForm();
    createSimulationMock.mockResolvedValue({
      ok: false,
      status: 500,
      message: 'boom',
    });
    fireEvent.click(screen.getByRole('button', { name: /Create simulation/i }));
    expect(await screen.findByText(/boom/)).toBeInTheDocument();
  });

  it('navigates to detail on success', async () => {
    render(<SimulationCreatePage />);
    fillForm();
    createSimulationMock.mockResolvedValue({ ok: true, id: 'sim-1' });
    fireEvent.click(screen.getByRole('button', { name: /Create simulation/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard/simulations/sim-1'));
  });
});
