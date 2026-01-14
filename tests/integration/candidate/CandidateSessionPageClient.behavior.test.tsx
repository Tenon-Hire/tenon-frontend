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

const fetchMock = jest.fn();
const realFetch = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  Object.values(routerMock).forEach((fn) => fn.mockReset());
  sessionStorage.clear();
  localStorage.clear();
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('CandidateSessionPage (auth flow)', () => {
  it('loads the simulation after fetching the Auth0 access token', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/api/auth/access-token')) {
        return jsonResponse({ accessToken: 'candidate-token' });
      }
      if (String(url).endsWith('/candidate/session/valid-token')) {
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
    sessionStorage.removeItem('tenon:candidate_session_v1');
    renderCandidateWithProviders(<CandidateSessionPage token="valid-token" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/candidate/session/valid-token',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer candidate-token',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/candidate/session/321/current_task',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer candidate-token',
        }),
      }),
    );

    const startBtn = await screen.findByRole('button', {
      name: /Start simulation/i,
    });
    await user.click(startBtn);

    const taskTitles = await screen.findAllByText('Task One');
    expect(taskTitles.length).toBeGreaterThan(0);
    const otpPath = ['verification', 'code'].join('/');
    expect(
      fetchMock.mock.calls.find(([url]) => String(url).includes(`/${otpPath}`)),
    ).toBeUndefined();
  });

  it('redirects to login when unauthenticated', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/api/auth/access-token')) {
        return jsonResponse({ message: 'Not authenticated' }, 401);
      }
      throw new Error(`Unexpected fetch ${String(url)}`);
    });

    renderCandidateWithProviders(<CandidateSessionPage token="valid-token" />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login?'),
      ),
    );
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/api/auth/access-token'),
      ),
    ).toHaveLength(1);
  });
});
