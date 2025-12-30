import '../../../setup/paramsMock';
import { setMockParams } from '../../../setup/paramsMock';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
      expect(screen.getByText('Plain failure')).toBeInTheDocument();
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
});
