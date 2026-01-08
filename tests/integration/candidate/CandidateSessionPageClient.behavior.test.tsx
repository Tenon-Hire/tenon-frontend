import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';
import { renderCandidateWithProviders } from '../../setup';
import { jsonResponse } from '../../setup/responseHelpers';

const routerMock = {
  push: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

jest.mock('@auth0/nextjs-auth0/client', () => ({
  getAccessToken: jest.fn().mockResolvedValue('auth-token'),
  useUser: () => ({ user: { email: 'prefill@example.com' } }),
}));

const fetchMock = jest.fn();
const realFetch = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  Object.values(routerMock).forEach((fn) => fn.mockReset());
  sessionStorage.clear();
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('CandidateSessionPage (auth flow)', () => {
  it('auto-claims the invite and loads the current task', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/claim')) {
        return jsonResponse({
          candidateSessionId: 321,
          status: 'in_progress',
          simulation: { title: 'Infra Simulation', role: 'Backend Engineer' },
        });
      }
      if (String(url).includes('/current_task')) {
        return jsonResponse({
          isComplete: false,
          completedTaskIds: [],
          currentTask: {
            id: 10,
            dayIndex: 1,
            type: 'design',
            title: 'Task One',
            description: 'Do it',
          },
        });
      }
      throw new Error(`Unexpected fetch ${String(url)}`);
    });

    const user = userEvent.setup();
    renderCandidateWithProviders(<CandidateSessionPage token="valid-token" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/candidate/session/valid-token/claim',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/candidate/session/321/current_task',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      }),
    );

    const startBtn = await screen.findByRole('button', {
      name: /Start simulation/i,
    });
    await user.click(startBtn);

    expect(await screen.findByText('Task One')).toBeInTheDocument();
  });

  it('surfaces wrong-account state on claim 403', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ message: 'invite@example.com' }, 403),
    );

    renderCandidateWithProviders(<CandidateSessionPage token="valid-token" />);

    expect(await screen.findByText(/invite@example.com/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Log out/i }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
