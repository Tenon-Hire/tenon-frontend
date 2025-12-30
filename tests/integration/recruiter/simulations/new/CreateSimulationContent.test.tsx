import '../../../setup/routerMock';
import { routerMock } from '../../../setup/routerMock';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimulationCreatePage from '@/features/recruiter/simulations/SimulationCreatePage';
import { createSimulation } from '@/lib/api/recruiter';

jest.mock('@/lib/api/recruiter', () => ({
  ...jest.requireActual('@/lib/api/recruiter'),
  createSimulation: jest.fn(),
}));

const createSimulationMock = createSimulation as jest.MockedFunction<
  typeof createSimulation
>;

describe('SimulationCreatePage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();
    render(<SimulationCreatePage />);

    await user.clear(screen.getByLabelText(/Title/i));
    await user.clear(screen.getByLabelText(/Role/i));
    await user.clear(screen.getByLabelText(/Tech stack/i));

    await user.click(
      screen.getByRole('button', { name: /Create simulation/i }),
    );

    expect(await screen.findByText(/Title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Role is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Tech stack is required/i)).toBeInTheDocument();
    expect(createSimulationMock).not.toHaveBeenCalled();
  });

  it('creates simulation and redirects to dashboard', async () => {
    const user = userEvent.setup();
    createSimulationMock.mockResolvedValueOnce({ id: 'sim_123' });

    render(<SimulationCreatePage />);

    await user.type(screen.getByLabelText(/Title/i), ' Backend Payments ');
    await user.clear(screen.getByLabelText(/Role/i));
    await user.type(screen.getByLabelText(/Role/i), ' Backend Engineer ');
    await user.clear(screen.getByLabelText(/Tech stack/i));
    await user.type(screen.getByLabelText(/Tech stack/i), ' Node + Postgres ');
    await user.type(screen.getByLabelText(/Focus /i), 'Messaging focus');

    await user.click(
      screen.getByRole('button', { name: /Create simulation/i }),
    );

    await waitFor(() => {
      expect(createSimulationMock).toHaveBeenCalledWith({
        title: 'Backend Payments',
        role: 'Backend Engineer',
        techStack: 'Node + Postgres',
        seniority: 'Mid',
        focus: 'Messaging focus',
      });
    });

    expect(routerMock.push).toHaveBeenCalledWith('/dashboard');
    expect(routerMock.refresh).toHaveBeenCalled();
  });

  it('shows form error when backend returns no id', async () => {
    const user = userEvent.setup();
    createSimulationMock.mockResolvedValueOnce({ id: '' });

    render(<SimulationCreatePage />);

    await user.type(screen.getByLabelText(/Title/i), 'Backend Sim');
    await user.click(
      screen.getByRole('button', { name: /Create simulation/i }),
    );

    expect(await screen.findByText(/no id was returned/i)).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('redirects to login on 401 response', async () => {
    const user = userEvent.setup();
    createSimulationMock.mockRejectedValueOnce({ status: 401 });

    render(<SimulationCreatePage />);

    await user.type(screen.getByLabelText(/Title/i), 'Backend Sim');
    await user.click(
      screen.getByRole('button', { name: /Create simulation/i }),
    );

    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith('/auth/login'),
    );
  });

  it('surfaces backend error message on failure', async () => {
    const user = userEvent.setup();
    createSimulationMock.mockRejectedValueOnce({
      status: 500,
      body: { detail: 'Server exploded' },
    });

    render(<SimulationCreatePage />);

    await user.type(screen.getByLabelText(/Title/i), 'Backend Sim');
    await user.click(
      screen.getByRole('button', { name: /Create simulation/i }),
    );

    expect(await screen.findByText(/Server exploded/i)).toBeInTheDocument();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it('navigates back to dashboard via header Back button', async () => {
    const user = userEvent.setup();
    render(<SimulationCreatePage />);

    await user.click(screen.getByRole('button', { name: /^Back$/i }));
    expect(routerMock.push).toHaveBeenCalledWith('/dashboard');
  });

  it('cancel button returns to dashboard without submitting', async () => {
    const user = userEvent.setup();
    render(<SimulationCreatePage />);

    await user.type(screen.getByLabelText(/Title/i), 'Backend Sim');
    await user.click(screen.getByRole('button', { name: /^Cancel$/i }));

    expect(routerMock.push).toHaveBeenCalledWith('/dashboard');
    expect(createSimulationMock).not.toHaveBeenCalled();
  });
});
