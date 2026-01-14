import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacePanel } from '@/features/candidate/session/task/components/WorkspacePanel';
import {
  getCandidateWorkspaceStatus,
  initCandidateWorkspace,
} from '@/lib/api/candidate';

jest.mock('@/lib/api/candidate', () => ({
  initCandidateWorkspace: jest.fn(),
  getCandidateWorkspaceStatus: jest.fn(),
}));

const initMock = initCandidateWorkspace as jest.Mock;
const statusMock = getCandidateWorkspaceStatus as jest.Mock;

describe('WorkspacePanel', () => {
  beforeEach(() => {
    initMock.mockReset();
    statusMock.mockReset();
  });

  it('loads workspace details and renders codespace CTA when available', async () => {
    statusMock.mockResolvedValueOnce({
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: 'https://codespaces.new/acme/repo',
    });

    render(
      <WorkspacePanel
        taskId={12}
        candidateSessionId={34}
        token="tok"
        dayIndex={2}
      />,
    );

    expect(await screen.findByText(/Workspace is ready/i)).toBeInTheDocument();
    expect(statusMock).toHaveBeenCalledWith({
      taskId: 12,
      token: 'tok',
      candidateSessionId: 34,
    });
    expect(initMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole('link', { name: /open codespace/i }),
    ).toHaveAttribute('href', 'https://codespaces.new/acme/repo');
    expect(screen.queryByRole('link', { name: /open repo/i })).toBeNull();
    expect(screen.getByText('acme/repo')).toBeInTheDocument();
  });

  it('refreshes workspace status on demand', async () => {
    const user = userEvent.setup();
    statusMock.mockResolvedValueOnce({
      repoUrl: null,
      repoName: null,
      codespaceUrl: null,
    });
    initMock.mockResolvedValueOnce({
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: null,
    });
    statusMock.mockResolvedValueOnce({
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: null,
    });

    render(
      <WorkspacePanel
        taskId={9}
        candidateSessionId={10}
        token="tok"
        dayIndex={3}
      />,
    );

    await screen.findByText(/Repository is ready/i);
    expect(statusMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('link', { name: /open repo/i }),
    ).toHaveAttribute('href', 'https://github.com/acme/repo');
    await user.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(statusMock).toHaveBeenCalledWith({
        taskId: 9,
        token: 'tok',
        candidateSessionId: 10,
      });
    });
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it('initializes when status is empty', async () => {
    statusMock.mockResolvedValueOnce({
      repoUrl: null,
      repoName: null,
      codespaceUrl: null,
    });
    initMock.mockResolvedValueOnce({
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: null,
    });

    render(
      <WorkspacePanel
        taskId={7}
        candidateSessionId={8}
        token="tok"
        dayIndex={2}
      />,
    );

    await screen.findByText(/Repository is ready/i);
    expect(statusMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('link', { name: /open repo/i }),
    ).toHaveAttribute('href', 'https://github.com/acme/repo');
  });

  it('initializes when status returns 404', async () => {
    statusMock.mockRejectedValueOnce({ status: 404 });
    initMock.mockResolvedValueOnce({
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: null,
    });

    render(
      <WorkspacePanel
        taskId={5}
        candidateSessionId={6}
        token="tok"
        dayIndex={2}
      />,
    );

    await screen.findByText(/Repository is ready/i);
    expect(statusMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('link', { name: /open repo/i }),
    ).toHaveAttribute('href', 'https://github.com/acme/repo');
  });

  it('shows a provisioning notice when repo is not ready yet', async () => {
    statusMock.mockRejectedValueOnce({
      status: 409,
      message: 'Workspace repo not provisioned yet. Please try again.',
    });

    render(
      <WorkspacePanel
        taskId={15}
        candidateSessionId={16}
        token="tok"
        dayIndex={2}
      />,
    );

    expect(
      await screen.findByText(/Workspace repo not provisioned yet/i),
    ).toBeInTheDocument();
    expect(initMock).not.toHaveBeenCalled();
  });
});
