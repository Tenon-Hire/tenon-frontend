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
    expect(screen.getByText(/Repo: acme\/repo/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /repo url/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
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
    expect(screen.getByRole('link', { name: /open repo/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
    expect(screen.getByRole('link', { name: /repo url/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
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

  it('renders repo CTA when codespace is not available', async () => {
    statusMock.mockResolvedValueOnce({
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: null,
    });

    render(
      <WorkspacePanel
        taskId={13}
        candidateSessionId={14}
        token="tok"
        dayIndex={2}
      />,
    );

    await screen.findByText(/Repository is ready/i);
    expect(initMock).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /open repo/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
    expect(screen.queryByRole('link', { name: /open codespace/i })).toBeNull();
    expect(screen.getByText(/Repo: acme\/repo/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /repo url/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
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
    expect(screen.getByRole('link', { name: /open repo/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
    expect(screen.getByRole('link', { name: /repo url/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
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
    expect(screen.getByRole('link', { name: /open repo/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
    expect(screen.getByRole('link', { name: /repo url/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
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

  it('shows session expired error when token is null', async () => {
    render(
      <WorkspacePanel
        taskId={17}
        candidateSessionId={18}
        token={null}
        dayIndex={2}
      />,
    );

    expect(
      await screen.findByText(/Session expired\. Please sign in again/i),
    ).toBeInTheDocument();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('shows session expired for 401 status errors', async () => {
    statusMock.mockRejectedValueOnce({ status: 401 });

    render(
      <WorkspacePanel
        taskId={19}
        candidateSessionId={20}
        token="tok"
        dayIndex={2}
      />,
    );

    expect(
      await screen.findByText(/Session expired\. Please sign in again/i),
    ).toBeInTheDocument();
  });

  it('shows session expired for 403 status errors', async () => {
    statusMock.mockRejectedValueOnce({ status: 403 });

    render(
      <WorkspacePanel
        taskId={21}
        candidateSessionId={22}
        token="tok"
        dayIndex={2}
      />,
    );

    expect(
      await screen.findByText(/Session expired\. Please sign in again/i),
    ).toBeInTheDocument();
  });

  it('shows generic error for other statuses', async () => {
    statusMock.mockRejectedValueOnce({
      status: 500,
      message: 'Server error',
    });

    render(
      <WorkspacePanel
        taskId={23}
        candidateSessionId={24}
        token="tok"
        dayIndex={2}
      />,
    );

    expect(await screen.findByText(/Server issue/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('does not double initialize when status 404 already attempted', async () => {
    statusMock.mockRejectedValueOnce({ status: 404 });
    initMock.mockResolvedValueOnce({
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: null,
    });
    statusMock.mockRejectedValueOnce({ status: 404 });

    render(
      <WorkspacePanel
        taskId={25}
        candidateSessionId={26}
        token="tok"
        dayIndex={2}
      />,
    );

    await screen.findByText(/Repository is ready/i);

    const user = (await import('@testing-library/user-event')).default.setup();
    await user.click(screen.getByRole('button', { name: /Refresh/i }));

    await waitFor(() => expect(statusMock).toHaveBeenCalledTimes(2));
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it('renders repo fullName when available', async () => {
    statusMock.mockResolvedValueOnce({
      repoUrl: 'https://github.com/org/fullname',
      repoName: 'shortname',
      repoFullName: 'org/fullname',
      codespaceUrl: null,
    });

    render(
      <WorkspacePanel
        taskId={27}
        candidateSessionId={28}
        token="tok"
        dayIndex={2}
      />,
    );

    expect(await screen.findByText(/Repo: org\/fullname/i)).toBeInTheDocument();
  });

  it('shows codespace link pending message when no links available', async () => {
    statusMock.mockResolvedValueOnce({
      repoUrl: null,
      repoName: null,
      codespaceUrl: null,
    });
    initMock.mockResolvedValueOnce({
      repoUrl: null,
      repoName: null,
      codespaceUrl: null,
    });

    render(
      <WorkspacePanel
        taskId={29}
        candidateSessionId={30}
        token="tok"
        dayIndex={2}
      />,
    );

    expect(
      await screen.findByText(/Workspace provisioning is underway/i),
    ).toBeInTheDocument();
  });
});
