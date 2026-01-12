import { render, screen } from '@testing-library/react';
import CandidateSubmissionsPage from '@/features/recruiter/candidate-submissions/CandidateSubmissionsPage';
import { getRequestUrl, jsonResponse } from '../../setup/responseHelpers';

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

describe('CandidateSubmissionsPage', () => {
  it('renders submission artifacts with test results', async () => {
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

    render(<CandidateSubmissionsPage />);

    expect(await screen.findByText(/Dee — Submissions/i)).toBeInTheDocument();
    expect(await screen.findByText(/Day 2: Debug API/i)).toBeInTheDocument();
    expect(screen.getByText(/\"passed\": true/i)).toBeInTheDocument();
  });

  it('matches candidateSessionId when route param is a string', async () => {
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
              submissionId: 2,
              candidateSessionId: 900,
              taskId: 7,
              dayIndex: 1,
              type: 'design',
              submittedAt: '2025-01-02T00:00:00Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          submissionId: 2,
          candidateSessionId: 900,
          task: {
            taskId: 7,
            dayIndex: 1,
            type: 'design',
            title: 'First Task',
            prompt: null,
          },
          contentText: 'Draft',
          code: null,
          testResults: null,
          submittedAt: '2025-01-02T00:00:00Z',
        }),
      );

    render(<CandidateSubmissionsPage />);

    expect(await screen.findByText(/First Task/i)).toBeInTheDocument();

    const calledUrls = fetchMock.mock.calls.map((call) =>
      getRequestUrl(call[0]),
    );
    expect(calledUrls).toContain('/api/submissions?candidateSessionId=900');
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

    render(<CandidateSubmissionsPage />);

    expect(
      await screen.findByText(/No submissions yet for this candidate/i),
    ).toBeInTheDocument();
  });

  it('renders friendly error when submissions list fails', async () => {
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
      .mockResolvedValueOnce(jsonResponse({ message: 'Upstream down' }, 500));
    params.id = 'sim-err';

    render(<CandidateSubmissionsPage />);

    expect(await screen.findByText(/Upstream down/i)).toBeInTheDocument();
  });

  it('surfaces network errors when submissions request rejects', async () => {
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
      .mockRejectedValueOnce(new Error('network fail'));

    render(<CandidateSubmissionsPage />);

    expect(await screen.findByText(/network fail/i)).toBeInTheDocument();
  });
});
