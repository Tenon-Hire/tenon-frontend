import { render, screen } from '@testing-library/react';
import CandidateSubmissionsPageClient from '@/features/recruiter/candidate-submissions/CandidateSubmissionsPageClient';
import { jsonResponse } from '../../setup/responseHelpers';

const params = { id: 'sim-1', candidateSessionId: '900' };

jest.mock('next/navigation', () => ({
  useParams: () => params,
}));

const fetchMock = jest.fn();
const realFetch = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  params.id = 'sim-1';
  params.candidateSessionId = '900';
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('CandidateSubmissionsPageClient', () => {
  it('renders submission artifacts with code and test results', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          {
            candidateSessionId: 900,
            inviteEmail: 'dee@example.com',
            candidateName: 'Dee',
            status: 'completed',
            startedAt: '2025-01-01T12:00:00Z',
            completedAt: '2025-01-02T12:00:00Z',
            hasReport: true,
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              submissionId: 1,
              candidateSessionId: 900,
              taskId: 5,
              dayIndex: 2,
              type: 'code',
              submittedAt: '2025-01-02T00:00:00Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          submissionId: 1,
          candidateSessionId: 900,
          task: {
            taskId: 5,
            dayIndex: 2,
            type: 'code',
            title: 'Debug API',
            prompt: 'Fix the failing request',
          },
          contentText: null,
          code: { blob: 'console.log("hi")', repoPath: 'src/index.ts' },
          testResults: { passed: true },
          submittedAt: '2025-01-02T00:00:00Z',
        }),
      );

    render(<CandidateSubmissionsPageClient />);

    expect(await screen.findByText(/Dee — Submissions/i)).toBeInTheDocument();
    expect(await screen.findByText(/Day 2: Debug API/i)).toBeInTheDocument();
    expect(screen.getByText(/console.log/)).toBeInTheDocument();
    expect(screen.getByText(/Path: src\/index\.ts/i)).toBeInTheDocument();
    expect(screen.getByText(/\"passed\": true/i)).toBeInTheDocument();
  });

  it('shows empty state when there are no submissions', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          {
            candidateSessionId: 900,
            inviteEmail: 'dee@example.com',
            candidateName: 'Dee',
            status: 'completed',
            startedAt: null,
            completedAt: null,
            hasReport: false,
          },
        ]),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));

    render(<CandidateSubmissionsPageClient />);

    expect(
      await screen.findByText(/No submissions yet for this candidate/i),
    ).toBeInTheDocument();
  });

  it('renders friendly error when submissions list fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([], 200))
      .mockResolvedValueOnce(jsonResponse({ message: 'Upstream down' }, 500));
    params.id = 'sim-err';

    render(<CandidateSubmissionsPageClient />);

    expect(await screen.findByText(/Upstream down/i)).toBeInTheDocument();
  });

  it('surfaces network errors when submissions request rejects', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([], 200))
      .mockRejectedValueOnce(new Error('network fail'));

    render(<CandidateSubmissionsPageClient />);

    expect(await screen.findByText(/network fail/i)).toBeInTheDocument();
  });
});
