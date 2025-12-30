import { render, screen } from '@testing-library/react';
import SimulationDetailPageClient from '@/features/recruiter/simulation-detail/SimulationDetailPageClient';
import { jsonResponse } from '../../setup/responseHelpers';

const params = { id: 'sim-1' };

jest.mock('next/navigation', () => ({
  useParams: () => params,
}));

const fetchMock = jest.fn();
const realFetch = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  params.id = 'sim-1';
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('SimulationDetailPageClient', () => {
  it('renders candidate rows with status badges', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          candidateSessionId: 11,
          inviteEmail: 'a@example.com',
          candidateName: 'Alex',
          status: 'in_progress',
          startedAt: '2025-01-01T00:00:00Z',
          completedAt: null,
          hasReport: false,
        },
        {
          candidateSessionId: 22,
          inviteEmail: 'b@example.com',
          candidateName: 'Blake',
          status: 'completed',
          startedAt: '2025-01-02T00:00:00Z',
          completedAt: '2025-01-03T00:00:00Z',
          hasReport: true,
        },
      ]),
    );

    render(<SimulationDetailPageClient />);

    expect(
      await screen.findByText(/Simulation ID: sim-1/i),
    ).toBeInTheDocument();
    expect(await screen.findByText('Alex')).toBeInTheDocument();
    expect(await screen.findByText('Blake')).toBeInTheDocument();
    expect(await screen.findByText(/In progress/i)).toBeInTheDocument();
    const completed = await screen.findAllByText(/Completed/i);
    expect(completed.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when there are no candidates', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    params.id = 'sim-empty';

    render(<SimulationDetailPageClient />);

    expect(await screen.findByText(/No candidates yet/i)).toBeInTheDocument();
  });

  it('renders error message when the backend call fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Auth failed' }, 500),
    );
    params.id = 'sim-err';

    render(<SimulationDetailPageClient />);

    expect(await screen.findByText(/Auth failed/i)).toBeInTheDocument();
  });
});
