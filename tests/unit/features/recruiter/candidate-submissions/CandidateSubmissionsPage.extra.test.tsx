/**
 * Additional tests for CandidateSubmissionsPage to close coverage gaps
 */
import React from 'react';
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import CandidateSubmissionsPage, {
  ArtifactCard,
} from '@/features/recruiter/simulations/candidates/CandidateSubmissionsPage';

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

type ArtifactType = {
  submissionId: number;
  candidateSessionId: number;
  task: {
    taskId: number;
    dayIndex: number;
    type: string;
    title: string;
    prompt: string | null;
  };
  contentText: string | null;
  code?: {
    blob?: string | null;
    repoPath?: string | null;
    repoFullName?: string | null;
    repoUrl?: string | null;
  } | null;
  repoUrl?: string | null;
  repoFullName?: string | null;
  workflowUrl?: string | null;
  commitUrl?: string | null;
  diffUrl?: string | null;
  diffSummary?: Record<string, unknown> | null;
  testResults: {
    passed: number | null;
    failed: number | null;
    total: number | null;
    stdout: string | null;
    stderr: string | null;
    stdoutTruncated?: boolean | null;
    stderrTruncated?: boolean | null;
    runId?: string | null;
    workflowRunId?: string | null;
    runStatus?: string | null;
    conclusion?: string | null;
    timeout?: boolean | null;
    summary?: unknown;
    commitUrl?: string | null;
    workflowUrl?: string | null;
  } | null;
  submittedAt: string;
};

const buildArtifact = (
  id: number,
  dayIndex: number,
  overrides?: Partial<ArtifactType>,
): ArtifactType => ({
  submissionId: id,
  candidateSessionId: 123,
  task: {
    taskId: 10 + id,
    dayIndex,
    type: 'code',
    title: `Task ${id}`,
    prompt: null,
  },
  contentText: null,
  repoUrl: null,
  repoFullName: null,
  workflowUrl: null,
  commitUrl: null,
  diffUrl: null,
  diffSummary: null,
  testResults: null,
  submittedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('CandidateSubmissionsPage extra coverage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    useParamsMock.mockReturnValue({ id: 'sim-1', candidateSessionId: '123' });
    listSimulationCandidatesMock.mockResolvedValue([
      {
        candidateSessionId: 123,
        candidateName: 'Test User',
        status: 'COMPLETED',
        inviteEmail: 'cand@test.com',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-05T00:00:00Z',
      },
    ]);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('handles 500 error during candidate verification', async () => {
    listSimulationCandidatesMock.mockRejectedValueOnce({ status: 500 });

    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });

    expect(
      await screen.findByText(/Unable to verify candidate access/i),
    ).toBeInTheDocument();
  });

  it('handles generic error during candidate fetch', async () => {
    listSimulationCandidatesMock.mockRejectedValueOnce(
      new Error('Network down'),
    );

    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });

    expect(await screen.findByText(/Network down/i)).toBeInTheDocument();
  });

  it('displays candidate name in header when available', async () => {
    recruiterGetMock.mockResolvedValue({ items: [] });

    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });
  });

  it('handles submissions list error after candidate verification', async () => {
    recruiterGetMock.mockRejectedValueOnce(new Error('List failed'));

    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });

    expect(await screen.findByText(/List failed/i)).toBeInTheDocument();

    // Test retry button
    recruiterGetMock.mockResolvedValueOnce({ items: [] });
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
  });

  it('displays missing Day 2/3 artifacts with unavailable message', async () => {
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
          ],
        });
      }
      // Artifact fetch fails
      return Promise.reject(new Error('Artifact not found'));
    });

    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/details unavailable/i)).toBeInTheDocument();
    });
  });

  it('handles pagination in show all mode', async () => {
    // Create many submissions
    const submissions = Array.from({ length: 12 }, (_, i) => ({
      submissionId: i + 1,
      candidateSessionId: 123,
      taskId: 10 + i,
      dayIndex: (i % 5) + 1,
      type: 'code',
      submittedAt: new Date(2024, 0, i + 1).toISOString(),
    }));

    recruiterGetMock.mockImplementation((path: string) => {
      if (path.startsWith('/submissions?')) {
        return Promise.resolve({ items: submissions });
      }
      const match = path.match(/\/submissions\/(\d+)/);
      if (match) {
        return Promise.resolve(buildArtifact(parseInt(match[1]), 2));
      }
      return Promise.resolve({});
    });

    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Latest GitHub artifacts/i)).toBeInTheDocument();
    });

    // Show all
    fireEvent.click(screen.getByRole('button', { name: /Show all/i }));

    await waitFor(() => {
      expect(screen.getByText(/Page 1/)).toBeInTheDocument();
    });

    // Next page
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => {
      expect(screen.getByText(/Page 2/)).toBeInTheDocument();
    });

    // Previous page
    fireEvent.click(screen.getByRole('button', { name: /Previous/i }));
    await waitFor(() => {
      expect(screen.getByText(/Page 1/)).toBeInTheDocument();
    });
  });

  it('picks latest submission by timestamp', async () => {
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
              dayIndex: 2,
              type: 'code',
              submittedAt: '2024-01-02T00:00:00Z', // Later
            },
          ],
        });
      }
      if (path.includes('/2')) {
        return Promise.resolve(
          buildArtifact(2, 2, { contentText: 'Latest submission' }),
        );
      }
      return Promise.resolve(buildArtifact(1, 2));
    });

    await act(async () => {
      render(<CandidateSubmissionsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Latest submission/i)).toBeInTheDocument();
    });
  });
});

describe('ArtifactCard coverage', () => {
  it('renders text submission with expand/collapse', async () => {
    const longText = 'x'.repeat(400);
    const artifact = buildArtifact(1, 1, {
      contentText: longText,
      task: {
        taskId: 1,
        dayIndex: 1,
        type: 'text',
        title: 'Text Task',
        prompt: 'Write something',
      },
    });

    render(<ArtifactCard artifact={artifact} />);

    expect(screen.getByText(/Text answer/)).toBeInTheDocument();
    expect(screen.getByText(/Prompt/)).toBeInTheDocument();

    // Expand
    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));
    expect(screen.getByTestId('md-preview')).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByRole('button', { name: /Collapse/i }));
  });

  it('renders code task with GitHub artifacts', () => {
    const artifact = buildArtifact(1, 2, {
      repoUrl: 'https://github.com/tenon/repo',
      repoFullName: 'tenon/repo',
      workflowUrl: 'http://workflow',
      commitUrl: 'http://commit',
      diffUrl: 'http://diff',
      diffSummary: { files: 3, additions: 100 },
      testResults: {
        passed: 5,
        failed: 1,
        total: 6,
        stdout: 'test output',
        stderr: 'error output',
        stdoutTruncated: false,
        stderrTruncated: false,
        runId: 'run-1',
        workflowRunId: 'wf-1',
        runStatus: 'completed',
        conclusion: 'failure',
        timeout: false,
        summary: { failures: ['test1'] },
        commitUrl: null,
        workflowUrl: null,
      },
    });

    render(<ArtifactCard artifact={artifact} />);

    expect(screen.getAllByText(/GitHub artifacts/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Repository/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/tenon\/repo/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Test results/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Failed/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Diff summary/).length).toBeGreaterThan(0);
  });

  it('renders test results with different statuses', () => {
    // Running status
    const runningArtifact = buildArtifact(1, 2, {
      testResults: {
        passed: null,
        failed: null,
        total: null,
        stdout: null,
        stderr: null,
        runStatus: 'in_progress',
        conclusion: null,
        timeout: false,
        workflowUrl: null,
        commitUrl: null,
      },
    });

    const { rerender } = render(<ArtifactCard artifact={runningArtifact} />);
    expect(screen.getByText(/Running/)).toBeInTheDocument();

    // Timeout status
    const timeoutArtifact = buildArtifact(1, 2, {
      testResults: {
        passed: null,
        failed: null,
        total: null,
        stdout: null,
        stderr: null,
        runStatus: null,
        conclusion: null,
        timeout: true,
        workflowUrl: null,
        commitUrl: null,
      },
    });

    rerender(<ArtifactCard artifact={timeoutArtifact} />);
    expect(screen.getAllByText(/Timed out/).length).toBeGreaterThan(0);

    // Success via conclusion
    const successArtifact = buildArtifact(1, 2, {
      testResults: {
        passed: null,
        failed: null,
        total: null,
        stdout: null,
        stderr: null,
        runStatus: null,
        conclusion: 'success',
        timeout: false,
        workflowUrl: null,
        commitUrl: null,
      },
    });

    rerender(<ArtifactCard artifact={successArtifact} />);
    expect(screen.getByText(/Passed/)).toBeInTheDocument();

    // Passed via counts
    const passedByCountArtifact = buildArtifact(1, 2, {
      testResults: {
        passed: 10,
        failed: 0,
        total: 10,
        stdout: null,
        stderr: null,
        runStatus: null,
        conclusion: null,
        timeout: false,
        workflowUrl: null,
        commitUrl: null,
      },
    });

    rerender(<ArtifactCard artifact={passedByCountArtifact} />);
    expect(screen.getAllByText(/Passed/).length).toBeGreaterThan(0);
  });

  it('renders log viewer with toggle', () => {
    const artifact = buildArtifact(1, 2, {
      testResults: {
        passed: 1,
        failed: 0,
        total: 1,
        stdout: 'stdout content',
        stderr: 'stderr content',
        stdoutTruncated: true,
        stderrTruncated: false,
        runStatus: null,
        conclusion: 'success',
        timeout: false,
        workflowUrl: null,
        commitUrl: null,
      },
    });

    render(<ArtifactCard artifact={artifact} />);

    // Find and click view buttons
    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    fireEvent.click(viewButtons[0]);

    expect(screen.getByText(/stdout content/)).toBeInTheDocument();

    // Hide
    fireEvent.click(screen.getByRole('button', { name: /Hide/i }));
  });

  it('handles Day 2/3 with repoPath as fullName', () => {
    const artifact = buildArtifact(1, 2, {
      repoUrl: null,
      repoFullName: null,
      code: {
        repoPath: 'owner/repo',
        repoFullName: null,
        repoUrl: null,
      },
    });

    render(<ArtifactCard artifact={artifact} />);
    expect(screen.getByText(/owner\/repo/)).toBeInTheDocument();
  });

  it('handles code with http repoPath', () => {
    const artifact = buildArtifact(1, 2, {
      repoUrl: null,
      code: {
        repoPath: 'https://github.com/tenon/repo',
      },
    });

    render(<ArtifactCard artifact={artifact} />);
    expect(
      screen.getByRole('link', { name: /https:\/\/github.com\/tenon\/repo/ }),
    ).toBeInTheDocument();
  });

  it('shows no text answer message for code task without content', () => {
    const artifact = buildArtifact(1, 1, {
      contentText: null,
      task: {
        taskId: 1,
        dayIndex: 1,
        type: 'text',
        title: 'Text',
        prompt: null,
      },
    });

    render(<ArtifactCard artifact={artifact} />);
    expect(screen.getByText(/No text answer submitted/)).toBeInTheDocument();
  });
});
