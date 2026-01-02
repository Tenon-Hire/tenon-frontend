import '../../../setup/paramsMock';
import { setMockParams } from '../../../setup/paramsMock';
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecruiterSimulationDetailPage from '@/features/recruiter/simulation-detail/RecruiterSimulationDetailPage';
import {
  getRequestUrl,
  jsonResponse,
  textResponse,
} from '../../../../setup/responseHelpers';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('RecruiterSimulationDetailPage', () => {
  beforeEach(() => {
    setMockParams({ id: '1' });

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 2,
            inviteEmail: 'jane@example.com',
            candidateName: 'Jane Doe',
            status: 'in_progress',
            startedAt: '2025-12-23T18:57:00.000000Z',
            completedAt: null,
            hasReport: false,
          },
          {
            candidateSessionId: 3,
            inviteEmail: 'bob@example.com',
            candidateName: null,
            status: 'completed',
            startedAt: '2025-12-23T10:00:00.000000Z',
            completedAt: '2025-12-23T12:00:00.000000Z',
            hasReport: false,
          },
        ]);
      }
      return textResponse('Not found', 404);
    });

    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('renders candidates list and links to candidate submissions', async () => {
    render(<RecruiterSimulationDetailPage />);

    expect(screen.getByText('Loading candidates…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();

    const bobEls = screen.getAllByText('bob@example.com');
    expect(bobEls.length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);

    const links = screen.getAllByRole('link', { name: 'View submissions →' });
    const hrefs = links.map((a) =>
      (a as HTMLAnchorElement).getAttribute('href'),
    );

    expect(hrefs).toContain('/dashboard/simulations/1/candidates/2');
    expect(hrefs).toContain('/dashboard/simulations/1/candidates/3');
  });

  it('renders empty state when there are no candidates', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([]);
      }
      return textResponse('Not found', 404);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('No candidates yet.')).toBeInTheDocument();
    });
  });

  it('renders error state when candidates request fails', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === '/api/simulations/1/candidates') {
        return jsonResponse({ message: 'Boom' }, 500);
      }
      return textResponse('Not found', 404);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Boom')).toBeInTheDocument();
    });
  });

  it('uses text fallback when candidates request fails with text/plain', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === '/api/simulations/1/candidates') {
        return textResponse('Plain failure', 500);
      }
      return textResponse('Not found', 404);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Request failed')).toBeInTheDocument();
    });
  });

  it('shows not started status, unnamed fallback, and text error fallback', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 9,
            inviteEmail: null,
            candidateName: null,
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            hasReport: false,
          },
        ]);
      }
      return textResponse('fallback error', 500);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Unnamed')).toBeInTheDocument();
    });

    expect(screen.getByText('Not started')).toBeInTheDocument();
  });

  it('handles thrown fetch errors gracefully', async () => {
    const fetchMock = jest.fn(async () => {
      throw new Error('network fail');
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    expect(await screen.findByText(/network fail/i)).toBeInTheDocument();
  });

  it('uses default error when fetch throws non-error value', async () => {
    const fetchMock = jest.fn(async () => {
      throw 'boom';
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    expect(await screen.findByText('Request failed')).toBeInTheDocument();
  });

  it('shows detail error message when provided by backend', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === '/api/simulations/1/candidates') {
        return jsonResponse({ detail: 'No access' }, 403);
      }
      return textResponse('Not found', 404);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    expect(await screen.findByText('No access')).toBeInTheDocument();
  });

  it('lets recruiters copy invite links from the table', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 42,
            inviteEmail: 'copy@example.com',
            candidateName: 'Copy Cat',
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            hasReport: false,
            inviteUrl: 'https://example.com/invite/token-123',
            inviteEmailStatus: 'sent',
            inviteEmailSentAt: '2025-12-23T10:00:00.000000Z',
          },
        ]);
      }
      return textResponse('Not found', 404);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    render(<RecruiterSimulationDetailPage />);

    const copyBtn = await screen.findByRole('button', {
      name: /copy invite link/i,
    });

    await user.click(copyBtn);

    await waitFor(() => {
      expect(copyBtn).toHaveTextContent(/copied/i);
    });
  });

  it('shows resend state and updates invite status after resending', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = getRequestUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return jsonResponse([
            {
              candidateSessionId: 99,
              inviteEmail: 'rate@example.com',
              candidateName: 'Retry Rex',
              status: 'not_started',
              startedAt: null,
              completedAt: null,
              hasReport: false,
              inviteEmailStatus: 'failed',
              inviteEmailSentAt: null,
              inviteEmailError: 'Email bounced',
            },
          ]);
        }
        if (url === '/api/simulations/1/candidates/99/invite/resend') {
          expect(init?.method).toBe('POST');
          return jsonResponse({
            candidateSessionId: 99,
            inviteEmailStatus: 'sent',
            inviteEmailSentAt: '2025-12-24T00:00:00.000000Z',
            inviteEmailError: null,
          });
        }
        return textResponse('Not found', 404);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    const resendBtn = await screen.findByRole('button', {
      name: /resend invite/i,
    });
    await user.click(resendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Sent at/i)).toBeInTheDocument();
      expect(screen.queryByText(/Email bounced/i)).not.toBeInTheDocument();
    });
  });

  it('disables resend and surfaces rate limit message', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = getRequestUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return jsonResponse([
            {
              candidateSessionId: 77,
              inviteEmail: 'rl@example.com',
              candidateName: 'Rate Limited',
              status: 'not_started',
              startedAt: null,
              completedAt: null,
              hasReport: false,
              inviteEmailStatus: 'failed',
              inviteEmailSentAt: null,
            },
          ]);
        }
        if (url === '/api/simulations/1/candidates/77/invite/resend') {
          expect(init?.method).toBe('POST');
          return jsonResponse(
            {
              candidateSessionId: 77,
              inviteEmailStatus: 'rate_limited',
              inviteEmailSentAt: null,
            },
            429,
          );
        }
        return textResponse('Not found', 404);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    const resendBtn = await screen.findByRole('button', {
      name: /resend invite/i,
    });
    await user.click(resendBtn);

    await waitFor(() => {
      expect(
        screen.getAllByText(/Rate limited — try again in ~30s/i).length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(resendBtn).toBeDisabled();
  });

  it('clears rate limit after cooldown expires', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = getRequestUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return jsonResponse([
            {
              candidateSessionId: 55,
              inviteEmail: 'cool@example.com',
              candidateName: 'Cooldown Casey',
              status: 'not_started',
              startedAt: null,
              completedAt: null,
              hasReport: false,
              inviteEmailStatus: 'failed',
              inviteEmailSentAt: null,
            },
          ]);
        }
        if (url === '/api/simulations/1/candidates/55/invite/resend') {
          expect(init?.method).toBe('POST');
          return jsonResponse(
            {
              candidateSessionId: 55,
              inviteEmailStatus: 'rate_limited',
              inviteEmailSentAt: null,
            },
            429,
          );
        }
        return textResponse('Not found', 404);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    const resendBtn = await screen.findByRole('button', {
      name: /resend invite/i,
    });
    await user.click(resendBtn);

    await waitFor(() => {
      expect(resendBtn).toBeDisabled();
      expect(
        screen.getAllByText(/Rate limited — try again in ~30s/i).length,
      ).toBeGreaterThanOrEqual(1);
    });

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      expect(resendBtn).not.toBeDisabled();
    });
    expect(
      screen.queryByText(/Rate limited — try again in ~30s/i),
    ).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('shows friendly not found error and refreshes on 404 resend', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = getRequestUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return jsonResponse([
            {
              candidateSessionId: 88,
              inviteEmail: 'gone@example.com',
              candidateName: 'Missing',
              status: 'not_started',
              startedAt: null,
              completedAt: null,
              hasReport: false,
              inviteEmailStatus: 'failed',
              inviteEmailSentAt: null,
            },
          ]);
        }
        if (url === '/api/simulations/1/candidates/88/invite/resend') {
          expect(init?.method).toBe('POST');
          return jsonResponse({ message: 'not found' }, 404);
        }
        return textResponse('Not found', 404);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    const resendBtn = await screen.findByRole('button', {
      name: /resend invite/i,
    });
    await user.click(resendBtn);

    await waitFor(
      () => {
        expect(
          screen.getByText('Candidate not found — refreshing list.'),
        ).toBeInTheDocument();
      },
      { timeout: 8000 },
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/simulations/1/candidates',
        expect.anything(),
      );
    });
  });

  it('does not get stuck loading under StrictMode navigation', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 2,
            inviteEmail: 'strict@example.com',
            candidateName: 'Strict Mode',
            status: 'in_progress',
            startedAt: '2025-12-23T18:57:00.000000Z',
            completedAt: null,
            hasReport: false,
          },
        ]);
      }
      return textResponse('Not found', 404);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <React.StrictMode>
        <RecruiterSimulationDetailPage />
      </React.StrictMode>,
    );

    expect(screen.getByText('Loading candidates…')).toBeInTheDocument();

    expect(await screen.findByText('Strict Mode')).toBeInTheDocument();
  });

  it('shows copy invite button even when invite URL is missing and surfaces error', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 12,
            inviteEmail: 'nolink@example.com',
            candidateName: 'No Link',
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            hasReport: false,
            inviteEmailStatus: 'sent',
            inviteEmailSentAt: '2025-12-23T10:00:00.000000Z',
            inviteUrl: null,
            inviteToken: null,
          },
        ]);
      }
      return textResponse('Not found', 404);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RecruiterSimulationDetailPage />);

    const copyBtn = await screen.findByRole('button', {
      name: /copy invite link/i,
    });
    expect(copyBtn).toBeDisabled();
    expect(
      screen.getByText(/Invite link unavailable — resend invite or refresh/i),
    ).toBeInTheDocument();
  });
});
