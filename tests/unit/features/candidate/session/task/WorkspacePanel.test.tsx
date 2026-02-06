import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacePanel } from '@/features/candidate/session/task/components/WorkspacePanel';

const notifyMock = jest.fn();

jest.mock('@/shared/notifications', () => ({
  useNotifications: () => ({ notify: notifyMock }),
}));

const getStatusMock = jest.fn();
const initWorkspaceMock = jest.fn();

jest.mock('@/features/candidate/api', () => ({
  getCandidateWorkspaceStatus: (...args: unknown[]) => getStatusMock(...args),
  initCandidateWorkspace: (...args: unknown[]) => initWorkspaceMock(...args),
}));

describe('WorkspacePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getStatusMock.mockReset();
    initWorkspaceMock.mockReset();
    notifyMock.mockReset();
  });

  const renderPanel = (
    opts?: Partial<{ token: string | null; dayIndex: number }>,
  ) =>
    render(
      <WorkspacePanel
        taskId={1}
        candidateSessionId={2}
        token={
          opts && Object.prototype.hasOwnProperty.call(opts, 'token')
            ? (opts.token ?? null)
            : 'tok'
        }
        dayIndex={opts?.dayIndex ?? 2}
      />,
    );

  it('renders ready state with repo and codespace links', async () => {
    getStatusMock.mockResolvedValue({
      repoUrl: 'https://github.com/tenon/repo',
      repoName: 'repo',
      codespaceUrl: 'https://codespaces.com/open',
    });
    renderPanel();
    expect(await screen.findByText(/Workspace is ready/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Repo URL/i })).toHaveAttribute(
      'href',
      'https://github.com/tenon/repo',
    );
    expect(
      screen.getByRole('link', { name: /Open Codespace/i }),
    ).toHaveAttribute('href', 'https://codespaces.com/open');
  });

  it('initializes workspace when status 404 and then shows message', async () => {
    const err = Object.assign(new Error('missing'), { status: 404 });
    getStatusMock.mockRejectedValueOnce(err);
    initWorkspaceMock.mockResolvedValue({
      repoUrl: 'http://repo',
      repoName: 'repo',
      codespaceUrl: null,
    });

    renderPanel();
    expect(await screen.findByText(/Repository is ready/i)).toBeInTheDocument();
    expect(initWorkspaceMock).toHaveBeenCalled();
  });

  it('shows provisioning notice on 409 and fires warning notification', async () => {
    const err = Object.assign(new Error('provisioning'), { status: 409 });
    getStatusMock.mockRejectedValueOnce(err);
    renderPanel();
    expect(
      await screen.findByText(/Workspace repo not provisioned yet/i),
    ).toBeInTheDocument();
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'warning' }),
    );
  });

  it('handles auth expiry by showing session expired error', async () => {
    const err = Object.assign(new Error('auth'), { status: 401 });
    getStatusMock.mockRejectedValueOnce(err);
    renderPanel();
    expect(
      await screen.findByText(/Session expired. Please sign in again./i),
    ).toBeInTheDocument();
  });

  it('refreshes workspace and sends success toast', async () => {
    getStatusMock.mockResolvedValue({
      repoUrl: 'http://repo',
      repoName: 'repo',
      codespaceUrl: 'http://codespace',
    });
    renderPanel();
    await screen.findByText(/Workspace is ready/i);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(getStatusMock).toHaveBeenCalledTimes(2);
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Workspace updated' }),
    );
  });

  it('disables refresh when loading or refreshing', async () => {
    // first call pending, second call resolves
    let resolveStatus: (val: unknown) => void;
    getStatusMock.mockReturnValueOnce(
      new Promise((res) => {
        resolveStatus = res;
      }),
    );
    const { getByRole } = renderPanel();
    const refresh = getByRole('button', { name: /Refresh/i });
    expect(refresh).toBeDisabled();
    // finish first fetch
    resolveStatus?.({
      repoUrl: null,
      repoName: null,
      codespaceUrl: null,
    });
    await screen.findByText(/Workspace provisioning is underway/i);
  });

  it('shows signin guidance when token missing', async () => {
    getStatusMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPanel({ token: null });
    await user.click(screen.getByRole('button', { name: /Refresh/i }));
    await screen.findByText(/Session expired\. Please sign in again\./i);
  });

  it('renders day index in header', async () => {
    getStatusMock.mockResolvedValue(null);
    renderPanel({ dayIndex: 3 });
    expect(await screen.findByText(/Day 3 workspace/i)).toBeInTheDocument();
  });
});
