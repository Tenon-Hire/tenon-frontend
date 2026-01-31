/**
 * Additional tests for WorkspacePanel to close coverage gaps
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacePanel } from '@/features/candidate/session/task/components/WorkspacePanel';

const notifyMock = jest.fn();

jest.mock('@/features/shared/notifications', () => ({
  useNotifications: () => ({ notify: notifyMock }),
}));

const getStatusMock = jest.fn();
const initWorkspaceMock = jest.fn();

jest.mock('@/lib/api/candidate', () => ({
  getCandidateWorkspaceStatus: (...args: unknown[]) => getStatusMock(...args),
  initCandidateWorkspace: (...args: unknown[]) => initWorkspaceMock(...args),
}));

describe('WorkspacePanel extra coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPanel = (
    opts?: Partial<{ token: string | null; dayIndex: number }>,
  ) =>
    render(
      <WorkspacePanel
        taskId={1}
        candidateSessionId={2}
        token={opts?.token ?? 'tok'}
        dayIndex={opts?.dayIndex ?? 2}
      />,
    );

  it('initializes workspace when status returns empty workspace', async () => {
    getStatusMock.mockResolvedValueOnce({
      repoUrl: null,
      repoName: null,
      codespaceUrl: null,
    });
    initWorkspaceMock.mockResolvedValue({
      repoUrl: 'http://repo',
      repoName: 'test-repo',
      codespaceUrl: null,
    });

    renderPanel();

    await waitFor(() => {
      expect(initWorkspaceMock).toHaveBeenCalled();
    });

    expect(await screen.findByText(/Repository is ready/i)).toBeInTheDocument();
  });

  it('shows only repoName when no repoUrl', async () => {
    getStatusMock.mockResolvedValue({
      repoUrl: null,
      repoName: 'test-repo-name',
      codespaceUrl: null,
    });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(/test-repo-name/)).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('link', { name: /Repo URL/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Codespace link will appear when ready/i),
    ).toBeInTheDocument();
  });

  it('shows Open Repo link when only repoUrl available', async () => {
    getStatusMock.mockResolvedValue({
      repoUrl: 'http://repo',
      repoName: null,
      codespaceUrl: null,
    });

    renderPanel();

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /Open Repo/i }),
      ).toBeInTheDocument();
    });
  });

  it('uses repoFullName when available', async () => {
    getStatusMock.mockResolvedValue({
      repoUrl: 'http://repo',
      repoName: 'short-name',
      repoFullName: 'org/full-repo-name',
      codespaceUrl: null,
    });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(/org\/full-repo-name/)).toBeInTheDocument();
    });
  });

  it('handles 403 as session expired', async () => {
    const err = Object.assign(new Error('forbidden'), { status: 403 });
    getStatusMock.mockRejectedValueOnce(err);

    renderPanel();

    expect(
      await screen.findByText(/Session expired. Please sign in again./i),
    ).toBeInTheDocument();
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Session expired' }),
    );
  });

  it('handles generic error on init', async () => {
    const err = Object.assign(new Error('server error'), { status: 500 });
    getStatusMock.mockRejectedValueOnce(err);

    renderPanel();

    await waitFor(() => {
      expect(notifyMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Workspace not available' }),
      );
    });
  });

  it('handles error on refresh with proper notification', async () => {
    getStatusMock.mockResolvedValueOnce({
      repoUrl: 'http://repo',
      codespaceUrl: null,
    });

    renderPanel();

    await screen.findByText(/Repository is ready/i);

    const err = Object.assign(new Error('refresh failed'), { status: 500 });
    getStatusMock.mockRejectedValueOnce(err);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Refresh/i }));

    // Wait for the refreshing state to complete
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Refresh/i }),
      ).not.toBeDisabled();
    });

    // Check that error notification was sent
    expect(notifyMock).toHaveBeenCalled();
  });

  it('shows Retry button on error', async () => {
    const err = Object.assign(new Error('error'), { status: 500 });
    getStatusMock.mockRejectedValueOnce(err);

    renderPanel();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Retry/i }),
      ).toBeInTheDocument();
    });

    getStatusMock.mockResolvedValueOnce({
      repoUrl: 'http://repo',
      codespaceUrl: 'http://codespace',
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/Workspace is ready/i)).toBeInTheDocument();
    });
  });

  it('re-throws error after 404 init attempt when still 404', async () => {
    const err = Object.assign(new Error('not found'), { status: 404 });
    getStatusMock.mockRejectedValueOnce(err);
    initWorkspaceMock.mockResolvedValueOnce({
      repoUrl: null,
      repoName: null,
      codespaceUrl: null,
    });

    renderPanel();

    await waitFor(() => {
      expect(
        screen.getByText(/Workspace provisioning is underway/i),
      ).toBeInTheDocument();
    });
  });

  it('does not re-initialize on second 404 after first attempt', async () => {
    const err404 = Object.assign(new Error('not found'), { status: 404 });
    getStatusMock.mockRejectedValueOnce(err404);
    initWorkspaceMock.mockResolvedValueOnce({
      repoUrl: null,
      repoName: null,
      codespaceUrl: null,
    });

    renderPanel();

    await waitFor(() => {
      expect(initWorkspaceMock).toHaveBeenCalledTimes(1);
    });

    // Second refresh should not re-init
    const err404Again = Object.assign(new Error('not found'), { status: 404 });
    getStatusMock.mockRejectedValueOnce(err404Again);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Refresh/i }));

    await waitFor(() => {
      // Should still only have 1 init call
      expect(initWorkspaceMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows workspace status updating message when only codespace available', async () => {
    getStatusMock.mockResolvedValue({
      repoUrl: null,
      repoName: null,
      codespaceUrl: 'http://codespace', // Only codespace, no repo
    });

    renderPanel();

    await waitFor(() => {
      expect(
        screen.getByText(/Workspace status is updating/i),
      ).toBeInTheDocument();
    });
  });

  it('clears initErrorNotified on successful load', async () => {
    const err = Object.assign(new Error('error'), { status: 500 });
    getStatusMock.mockRejectedValueOnce(err);

    renderPanel();

    await waitFor(() => {
      expect(notifyMock).toHaveBeenCalledTimes(1);
    });

    getStatusMock.mockResolvedValueOnce({
      repoUrl: 'http://repo',
      codespaceUrl: 'http://codespace',
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/Workspace is ready/i)).toBeInTheDocument();
    });

    // If we error again, notification should fire again since flag was cleared
    const errAgain = Object.assign(new Error('error again'), { status: 500 });
    getStatusMock.mockRejectedValueOnce(errAgain);

    await user.click(screen.getByRole('button', { name: /Refresh/i }));

    await waitFor(() => {
      // Should have 3 notifications: init error, refresh success, refresh error
      expect(notifyMock).toHaveBeenCalledTimes(3);
    });
  });
});
