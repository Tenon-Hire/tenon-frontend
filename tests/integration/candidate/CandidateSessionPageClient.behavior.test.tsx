import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';
import { setAuthToken } from '@/lib/auth';
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

describe('CandidateSessionPage (verification flow)', () => {
  it('verifies the invite and loads the current task', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/verification/code/send')) {
        return jsonResponse({
          status: 'sent',
          maskedEmail: 'p***@example.com',
          expiresAt: '2025-01-01T00:00:00Z',
        });
      }
      if (String(url).includes('/verification/code/confirm')) {
        return jsonResponse({
          verified: true,
          candidateAccessToken: 'candidate-token',
          expiresAt: '2025-01-02T00:00:00Z',
        });
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
    setAuthToken(null);
    sessionStorage.removeItem('tenon:candidate_session_v1');
    renderCandidateWithProviders(<CandidateSessionPage token="valid-token" />);

    expect(await screen.findByText(/Verify your invite/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'prefill@example.com' },
    });
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await user.click(screen.getByRole('button', { name: /Verify code/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/candidate/session/valid-token/verification/code/send',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/candidate/session/valid-token/verification/code/confirm',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const sendCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/verification/code/send'),
    );
    const confirmCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/verification/code/confirm'),
    );
    expect(sendCall?.[1]?.headers).not.toHaveProperty('Authorization');
    expect(confirmCall?.[1]?.headers).not.toHaveProperty('Authorization');
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

    expect(await screen.findByText('Task One')).toBeInTheDocument();
  });

  it('shows lockout state on otp_locked', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/verification/code/send')) {
        return jsonResponse({
          status: 'sent',
          maskedEmail: 'p***@example.com',
          expiresAt: '2025-01-01T00:00:00Z',
        });
      }
      if (String(url).includes('/verification/code/confirm')) {
        return jsonResponse({ error: 'otp_locked' }, 429);
      }
      throw new Error(`Unexpected fetch ${String(url)}`);
    });

    const user = userEvent.setup();
    renderCandidateWithProviders(<CandidateSessionPage token="valid-token" />);

    await screen.findByText(/Verify your invite/i);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'prefill@example.com' },
    });
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await user.click(screen.getByRole('button', { name: /Verify code/i }));

    expect(await screen.findByText(/Too many attempts/i)).toBeInTheDocument();
  });
});
