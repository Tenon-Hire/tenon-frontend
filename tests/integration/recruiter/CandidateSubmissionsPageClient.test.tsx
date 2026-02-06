import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateSubmissionsPage from '@/features/recruiter/candidate-submissions/CandidateSubmissionsPage';
import {
  recruiterBffClient,
  bffClient,
  __resetHttpClientCache,
} from '@/lib/api/httpClient';
import { __resetCandidateCache } from '@/lib/api/recruiter';

const params = { id: 'sim-1', candidateSessionId: '900' };

jest.mock('next/navigation', () => ({
  useParams: () => params,
}));

jest.mock('@/lib/api/httpClient', () => {
  const actual = jest.requireActual('@/lib/api/httpClient');
  return {
    ...actual,
    recruiterBffClient: { get: jest.fn() },
    bffClient: { get: jest.fn() },
    __resetHttpClientCache: jest.fn(),
  };
});

beforeEach(() => {
  jest.resetAllMocks();
  params.id = 'sim-1';
  params.candidateSessionId = '900';
  __resetCandidateCache();
  __resetHttpClientCache();
  (bffClient.get as jest.Mock).mockReset();
  (recruiterBffClient.get as jest.Mock).mockReset();
});

const mirrorBffGet = (getMock: jest.Mock) => {
  const bffGet = bffClient.get as jest.Mock;
  bffGet.mockImplementation(async (path: string, options?: unknown) => {
    const data = await getMock(path, options);
    return { ok: true, data, requestId: null };
  });
};

describe('CandidateSubmissionsPage', () => {
  it('renders submission artifacts with test results', async () => {
    const getMock = recruiterBffClient.get as jest.Mock;
    getMock.mockImplementation((path: string) => {
      if (path.includes('/simulations/sim-1/candidates')) {
        return Promise.resolve([
          {
            candidateSessionId: 900,
            inviteEmail: 'dee@example.com',
            candidateName: 'Dee',
            status: 'completed',
            startedAt: '2025-01-01T12:00:00Z',
            completedAt: '2025-01-02T12:00:00Z',
            hasReport: true,
          },
        ]);
      }
      if (path.includes('/submissions?candidateSessionId=900')) {
        return Promise.resolve({
          items: [
            {
              submissionId: 1,
              candidateSessionId: 900,
              taskId: 5,
              dayIndex: 2,
              type: 'code',
              submittedAt: '2025-01-02T00:00:00Z',
              repoUrl: 'https://github.com/acme/day2',
              workflowUrl: 'https://github.com/acme/day2/actions/runs/123',
              commitUrl: 'https://github.com/acme/day2/commit/abc123',
              diffUrl: 'https://github.com/acme/day2/commit/abc123?diff=split',
            },
            {
              submissionId: 2,
              candidateSessionId: 900,
              taskId: 6,
              dayIndex: 3,
              type: 'debug',
              submittedAt: '2025-01-03T00:00:00Z',
              repoFullName: 'acme/day3',
            },
          ],
        });
      }
      if (path.includes('/submissions/1')) {
        return Promise.resolve({
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
          code: {
            blob: 'console.log("hi")',
            repoPath: 'src/index.ts',
            repoFullName: 'acme/day2',
          },
          repoUrl: 'https://github.com/acme/day2',
          repoFullName: 'acme/day2',
          workflowUrl: 'https://github.com/acme/day2/actions/runs/123',
          commitUrl: 'https://github.com/acme/day2/commit/abc123',
          diffUrl: 'https://github.com/acme/day2/commit/abc123?diff=split',
          diffSummary: { filesChanged: 3 },
          testResults: {
            passed: 10,
            failed: 2,
            total: 12,
            stdout: 'suite output',
            stderr: 'lint warning',
            workflowRunId: '123',
            workflowUrl: 'https://github.com/acme/day2/actions/runs/123',
            commitUrl: 'https://github.com/acme/day2/commit/abc123',
            conclusion: 'failure',
            runStatus: 'completed',
          },
          submittedAt: '2025-01-02T00:00:00Z',
        });
      }
      if (path.includes('/submissions/2')) {
        return Promise.resolve({
          submissionId: 2,
          candidateSessionId: 900,
          task: {
            taskId: 6,
            dayIndex: 3,
            type: 'debug',
            title: 'Fix Day3',
            prompt: null,
          },
          contentText: null,
          code: null,
          repoFullName: 'acme/day3',
          repoUrl: null,
          workflowUrl: 'https://github.com/acme/day3/actions/runs/456',
          commitUrl: 'https://github.com/acme/day3/commit/def456',
          diffUrl: 'https://github.com/acme/day3/commit/def456?diff=split',
          testResults: {
            passed: 5,
            failed: 0,
            total: 5,
            stdout: 'day3 stdout',
            stderr: null,
            workflowRunId: '456',
            workflowUrl: 'https://github.com/acme/day3/actions/runs/456',
            commitUrl: 'https://github.com/acme/day3/commit/def456',
            conclusion: 'success',
            runStatus: 'completed',
          },
          submittedAt: '2025-01-03T00:00:00Z',
        });
      }
      throw new Error(`Unexpected path ${path}`);
    });
    mirrorBffGet(getMock);

    const user = userEvent.setup();
    render(<CandidateSubmissionsPage />);

    expect(await screen.findByText(/Dee — Submissions/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Latest GitHub artifacts/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Day 2: Debug API/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Day 3: Fix Day3/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: /acme\/day2/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: /Workflow run/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Passed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Failed/i).length).toBeGreaterThan(0);

    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    expect(viewButtons.length).toBeGreaterThan(0);
    await user.click(viewButtons[0]);
    expect(await screen.findByText(/suite output/i)).toBeInTheDocument();
  });

  it('matches candidateSessionId when route param is a string', async () => {
    const getMock = recruiterBffClient.get as jest.Mock;
    getMock.mockImplementation((path: string) => {
      if (path.includes('/simulations/sim-1/candidates')) {
        return Promise.resolve([
          {
            candidateSessionId: 900,
            inviteEmail: 'dee@example.com',
            candidateName: 'Dee',
            status: 'completed',
            startedAt: '2025-01-01T12:00:00Z',
            completedAt: '2025-01-02T12:00:00Z',
            hasReport: true,
          },
        ]);
      }
      if (path.includes('/submissions?candidateSessionId=900')) {
        return Promise.resolve({
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
        });
      }
      if (path.includes('/submissions/2')) {
        return Promise.resolve({
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
        });
      }
      throw new Error(`Unexpected path ${path}`);
    });
    mirrorBffGet(getMock);

    const user = userEvent.setup();
    render(<CandidateSubmissionsPage />);

    await user.click(await screen.findByRole('button', { name: /Show all/i }));
    expect(await screen.findByText(/First Task/i)).toBeInTheDocument();

    const calledUrls = (getMock.mock.calls as [string][]).map(
      (call) => call[0],
    );
    expect(calledUrls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/simulations/sim-1/candidates'),
        expect.stringContaining('/submissions?candidateSessionId=900'),
        expect.stringContaining('/submissions/2'),
      ]),
    );
  });

  it('shows empty state when no submissions exist', async () => {
    const getMock = recruiterBffClient.get as jest.Mock;
    getMock.mockImplementation((path: string) => {
      if (path.includes('/simulations/sim-1/candidates')) {
        return Promise.resolve([
          {
            candidateSessionId: 900,
            inviteEmail: 'empty@example.com',
            candidateName: 'Empty',
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            hasReport: false,
          },
        ]);
      }
      if (path.includes('/submissions?candidateSessionId=900')) {
        return Promise.resolve({ items: [] });
      }
      throw new Error(`Unexpected path ${path}`);
    });
    mirrorBffGet(getMock);

    render(<CandidateSubmissionsPage />);

    expect(await screen.findByText(/No submissions yet/i)).toBeInTheDocument();
  });

  it('surfaces submissions list errors', async () => {
    const getMock = recruiterBffClient.get as jest.Mock;
    getMock.mockImplementation((path: string) => {
      if (path.includes('/simulations/sim-1/candidates')) {
        return Promise.resolve([
          {
            candidateSessionId: 900,
            inviteEmail: 'err@example.com',
            candidateName: 'Err',
            status: 'completed',
            startedAt: '2025-01-01T12:00:00Z',
            completedAt: '2025-01-02T12:00:00Z',
            hasReport: false,
          },
        ]);
      }
      if (path.includes('/submissions?candidateSessionId=900')) {
        return Promise.reject(new Error('Detailed failure'));
      }
      throw new Error(`Unexpected path ${path}`);
    });
    mirrorBffGet(getMock);

    render(<CandidateSubmissionsPage />);

    expect(await screen.findByText('Detailed failure')).toBeInTheDocument();
  });

  it('surfaces network rejection errors gracefully', async () => {
    const getMock = recruiterBffClient.get as jest.Mock;
    getMock.mockImplementation((path: string) => {
      if (path.includes('/simulations/sim-1/candidates')) {
        return Promise.resolve([
          {
            candidateSessionId: 900,
            inviteEmail: 'net@example.com',
            candidateName: 'Net',
            status: 'completed',
            startedAt: '2025-01-01T12:00:00Z',
            completedAt: '2025-01-02T12:00:00Z',
            hasReport: false,
          },
        ]);
      }
      if (path.includes('/submissions?candidateSessionId=900')) {
        return Promise.reject(new Error('network rejection'));
      }
      throw new Error(`Unexpected path ${path}`);
    });
    mirrorBffGet(getMock);

    render(<CandidateSubmissionsPage />);

    expect(await screen.findByText(/network rejection/i)).toBeInTheDocument();
  });
});
