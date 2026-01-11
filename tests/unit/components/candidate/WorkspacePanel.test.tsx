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

  it('loads workspace details and renders repo + codespace links', async () => {
    initMock.mockResolvedValueOnce({
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
    expect(screen.getByRole('link', { name: /acme\/repo/i })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo',
    );
    expect(
      screen.getByRole('link', { name: /open codespace/i }),
    ).toHaveAttribute('href', 'https://codespaces.new/acme/repo');
  });

  it('refreshes workspace status on demand', async () => {
    const user = userEvent.setup();
    initMock.mockResolvedValueOnce({
      repoUrl: null,
      repoName: null,
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

    await screen.findByText(/Workspace provisioning/i);
    await user.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(statusMock).toHaveBeenCalledWith({
        taskId: 9,
        token: 'tok',
        candidateSessionId: 10,
      });
    });
  });
});
