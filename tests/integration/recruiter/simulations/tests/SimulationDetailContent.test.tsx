import '../../../setup/paramsMock';
import { setMockParams } from '../../../setup/paramsMock';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SimulationDetailContent from '@/app/(private)/(recruiter)/dashboard/simulations/[id]/SimulationDetailContent';

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

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  headers: { get: (_k: string) => string | null };
};

function mockJsonResponse(body: unknown, status = 200): MockResponse {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => text,
    headers: { get: () => 'application/json' },
  };
}

function mockTextResponse(body: string, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new Error('Invalid JSON');
    },
    text: async () => body,
    headers: { get: () => 'text/plain' },
  };
}

function getUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe('SimulationDetailContent', () => {
  beforeEach(() => {
    setMockParams({ id: '1' });

    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return mockJsonResponse([
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
        return mockTextResponse('Not found', 404);
      },
    );

    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders candidates list and links to candidate submissions', async () => {
    render(<SimulationDetailContent />);

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
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return mockJsonResponse([]);
        }
        return mockTextResponse('Not found', 404);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SimulationDetailContent />);

    await waitFor(() => {
      expect(screen.getByText('No candidates yet.')).toBeInTheDocument();
    });
  });

  it('renders error state when candidates request fails', async () => {
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return mockJsonResponse({ message: 'Boom' }, 500);
        }
        return mockTextResponse('Not found', 404);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SimulationDetailContent />);

    await waitFor(() => {
      expect(screen.getByText('Boom')).toBeInTheDocument();
    });
  });

  it('uses text fallback when candidates request fails with text/plain', async () => {
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return mockTextResponse('Plain failure', 500);
        }
        return mockTextResponse('Not found', 404);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SimulationDetailContent />);

    await waitFor(() => {
      expect(screen.getByText('Plain failure')).toBeInTheDocument();
    });
  });

  it('shows not started status, unnamed fallback, and text error fallback', async () => {
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return mockJsonResponse([
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
        return mockTextResponse('fallback error', 500);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SimulationDetailContent />);

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

    render(<SimulationDetailContent />);

    expect(await screen.findByText(/network fail/i)).toBeInTheDocument();
  });

  it('uses default error when fetch throws non-error value', async () => {
    const fetchMock = jest.fn(async () => {
      throw 'boom';
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SimulationDetailContent />);

    expect(await screen.findByText('Request failed')).toBeInTheDocument();
  });

  it('shows detail error message when provided by backend', async () => {
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);
        if (url === '/api/simulations/1/candidates') {
          return mockJsonResponse({ detail: 'No access' }, 403);
        }
        return mockTextResponse('Not found', 404);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SimulationDetailContent />);

    expect(await screen.findByText('No access')).toBeInTheDocument();
  });
});
