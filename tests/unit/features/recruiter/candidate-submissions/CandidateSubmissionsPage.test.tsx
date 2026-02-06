import React from 'react';
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import CandidateSubmissionsPage from '@/features/recruiter/simulations/candidates/CandidateSubmissionsPage';

const listSimulationCandidatesMock = jest.fn();
const recruiterGetMock = jest.fn();
const useParamsMock = jest.fn(() => ({
  id: 'sim-1',
  candidateSessionId: '123',
}));

jest.mock('next/navigation', () => ({
  useParams: () => useParamsMock(),
}));

jest.mock('@/features/recruiter/api', () => ({
  listSimulationCandidates: (...args: unknown[]) =>
    listSimulationCandidatesMock(...args),
}));

jest.mock('@/lib/api/client', () => ({
  recruiterBffClient: {
    get: (...args: unknown[]) => recruiterGetMock(...args),
  },
}));

jest.mock('next/dynamic', () => {
  return (
    _importer: () => Promise<unknown>,
    opts: { loading?: () => JSX.Element },
  ) => {
    const Mock: React.FC<{ content?: string }> = (props) => (
      <div data-testid="md-preview">{props.content}</div>
    );
    const mockWithStatics = Mock as React.FC<{ content?: string }> & {
      loading?: () => JSX.Element;
    };
    mockWithStatics.loading = opts?.loading;
    return mockWithStatics;
  };
});

const buildArtifact = (id: number, dayIndex: number) => ({
  submissionId: id,
  candidateSessionId: 123,
  task: {
    taskId: 10 + id,
    dayIndex,
    type: 'code',
    title: `Task ${id}`,
    prompt: 'prompt',
  },
  contentText: 'answer',
  repoUrl: 'https://github.com/tenon/repo',
  repoFullName: 'tenon/repo',
  workflowUrl: 'http://wf',
  commitUrl: 'http://commit',
  diffUrl: null,
  diffSummary: { files: 1 },
  testResults: {
    passed: 1,
    failed: 0,
    total: 1,
    stdout: 'out',
    stderr: '',
    workflowUrl: 'http://wf',
    commitUrl: 'http://commit',
  },
  submittedAt: '2024-01-01T00:00:00Z',
});

describe('CandidateSubmissionsPage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    useParamsMock.mockReturnValue({ id: 'sim-1', candidateSessionId: '123' });
    listSimulationCandidatesMock.mockResolvedValue([
      {
        candidateSessionId: 123,
        status: 'IN_PROGRESS',
        inviteEmail: 'cand@test.com',
      },
    ]);

    recruiterGetMock.mockImplementation((path: string) => {
      if (path.startsWith('/submissions?')) {
        return Promise.resolve({
          items: [
            {
              submissionId: 1,
              candidateSessionId: 123,
              taskId: 11,
              dayIndex: 2,
              type: 'code',
              submittedAt: '2024-01-01T00:00:00Z',
            },
            {
              submissionId: 2,
              candidateSessionId: 123,
              taskId: 12,
              dayIndex: 3,
              type: 'code',
              submittedAt: '2024-01-02T00:00:00Z',
            },
          ],
        });
      }
      if (path.startsWith('/submissions/1')) {
        return Promise.resolve(buildArtifact(1, 2));
      }
      if (path.startsWith('/submissions/2')) {
        return Promise.resolve(buildArtifact(2, 3));
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows error for invalid candidate id', async () => {
    useParamsMock.mockReturnValue({ id: 'sim-1', candidateSessionId: 'bad' });
    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });
    expect(
      await screen.findByText(/Invalid candidate id/i),
    ).toBeInTheDocument();
  });

  it('shows candidate not found error', async () => {
    useParamsMock.mockReturnValue({ id: 'sim-1', candidateSessionId: '123' });
    listSimulationCandidatesMock.mockResolvedValueOnce([]);
    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });
    expect(await screen.findByText(/Candidate not found/i)).toBeInTheDocument();
  });

  it('renders submissions, latest artifacts, and toggles show all', async () => {
    useParamsMock.mockReturnValue({ id: 'sim-1', candidateSessionId: '123' });
    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });

    await waitFor(() =>
      expect(screen.getByText(/Latest GitHub artifacts/i)).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Day 2|Day 3/).length).toBeGreaterThan(0);

    const showAllBtn = await screen.findByRole('button', { name: /Show all/i });
    fireEvent.click(showAllBtn);
    await waitFor(() => expect(screen.getByText(/Page 1/)).toBeInTheDocument());
    expect(recruiterGetMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Hide list/i }));
    expect(screen.getByText(/Submission list collapsed/i)).toBeInTheDocument();
  });

  it('handles empty submissions and refresh', async () => {
    recruiterGetMock.mockImplementationOnce((path: string) => {
      if (path.startsWith('/submissions?'))
        return Promise.resolve({ items: [] });
      return Promise.resolve({});
    });
    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });
    expect(await screen.findByText(/No submissions yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
  });
});
