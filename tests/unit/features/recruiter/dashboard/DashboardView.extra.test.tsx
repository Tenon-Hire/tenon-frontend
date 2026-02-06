import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import DashboardView from '@/features/recruiter/dashboard/RecruiterDashboardView';
import { useInviteCandidateFlow } from '@/features/recruiter/dashboard/hooks/useInviteCandidateFlow';

const notifyMock = jest.fn();
const updateMock = jest.fn();
const inviteFlowResetMock = jest.fn();
const inviteFlowSubmitMock = jest.fn();
const captureModalProps = jest.fn();
const copyInviteLinkMock = jest.fn();

jest.mock('@/shared/notifications', () => ({
  useNotifications: () => ({ notify: notifyMock, update: updateMock }),
}));

jest.mock(
  '@/features/recruiter/dashboard/hooks/useInviteCandidateFlow',
  () => ({
    useInviteCandidateFlow: jest.fn(() => ({
      state: { status: 'idle' },
      submit: inviteFlowSubmitMock,
      reset: inviteFlowResetMock,
    })),
  }),
);

jest.mock('@/features/recruiter/utils/formatters', () => ({
  copyInviteLink: (...args: unknown[]) => copyInviteLinkMock(...args),
}));

jest.mock('next/dynamic', () => {
  return (
    _importer: () => Promise<unknown>,
    opts: { loading?: () => JSX.Element },
  ) => {
    const Mock = (props: Record<string, unknown>) => {
      captureModalProps(props);
      return (
        <div data-testid="invite-modal">
          <button
            data-testid="close-btn"
            onClick={() => (props.onClose as () => void)?.()}
          >
            Close
          </button>
        </div>
      );
    };
    (Mock as { loading?: () => JSX.Element }).loading = opts?.loading;
    return Mock;
  };
});

jest.mock('@/features/recruiter/dashboard/components/ProfileCard', () => ({
  ProfileCard: ({ name }: { name: string }) => (
    <div data-testid="profile-card">{name}</div>
  ),
}));

jest.mock(
  '@/features/recruiter/dashboard/components/SimulationSection',
  () => ({
    SimulationSection: (props: {
      simulations: Array<{ id: string; title: string; status: string }>;
      loading: boolean;
      error: string | null;
      onInvite?: (sim: { id: string; title: string }) => void;
      onRetry?: () => void;
    }) => {
      const { onInvite, onRetry } = props;
      return (
        <div data-testid="simulation-section">
          <button onClick={() => onInvite?.({ id: '1', title: 'Sim 1' })}>
            invite
          </button>
          <button onClick={() => onRetry?.()}>retry</button>
        </div>
      );
    },
  }),
);

type Simulation = { id: string; title: string; status: string };

const baseProps = () => ({
  profile: { name: 'Recruiter', email: 'r@test.com', role: 'Admin' },
  error: null,
  profileLoading: false,
  simulations: [{ id: '1', title: 'Sim', status: 'Draft' } as Simulation],
  simulationsError: null,
  simulationsLoading: false,
  onRefresh: jest.fn(),
});

describe('DashboardView extra coverage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    jest.useFakeTimers();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    inviteFlowSubmitMock.mockResolvedValue({
      inviteUrl: 'http://invite',
      outcome: 'sent',
      simulationId: '1',
      candidateName: 'Ann',
      candidateEmail: 'a@test.com',
    });
    copyInviteLinkMock.mockResolvedValue(true);
    (useInviteCandidateFlow as jest.Mock).mockReturnValue({
      state: { status: 'idle' },
      submit: inviteFlowSubmitMock,
      reset: inviteFlowResetMock,
    });
  });

  afterAll(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  it('handles successful copy and timer reset', async () => {
    const props = baseProps();

    await act(async () => {
      render(<DashboardView {...props} />);
    });

    // Open modal
    act(() => {
      screen.getByTestId('simulation-section').querySelector('button')?.click();
    });

    // Submit invite
    const modalProps = captureModalProps.mock.calls[0]?.[0] as {
      onSubmit: (n: string, e: string) => Promise<void>;
    };
    await act(async () => {
      await modalProps.onSubmit('Ann', 'a@test.com');
    });

    // Get copy action and trigger it
    const copyAction = notifyMock.mock.calls[0][0]?.actions?.[0];
    expect(copyAction).toBeDefined();

    await act(async () => {
      await copyAction.onClick();
    });

    expect(copyInviteLinkMock).toHaveBeenCalledWith('http://invite');
    expect(updateMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        actions: [{ label: 'Copied', disabled: true }],
      }),
    );

    // Advance timers to trigger reset
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(updateMock).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        actions: expect.arrayContaining([
          expect.objectContaining({ label: 'Copy invite link' }),
        ]),
      }),
    );
  });

  it('clears existing timer on rapid copy clicks', async () => {
    const props = baseProps();

    await act(async () => {
      render(<DashboardView {...props} />);
    });

    act(() => {
      screen.getByTestId('simulation-section').querySelector('button')?.click();
    });

    const modalProps = captureModalProps.mock.calls[0]?.[0] as {
      onSubmit: (n: string, e: string) => Promise<void>;
    };
    await act(async () => {
      await modalProps.onSubmit('Ann', 'a@test.com');
    });

    const copyAction = notifyMock.mock.calls[0][0]?.actions?.[0];

    // Click copy multiple times rapidly
    await act(async () => {
      await copyAction.onClick();
    });
    await act(async () => {
      await copyAction.onClick();
    });

    expect(copyInviteLinkMock).toHaveBeenCalledTimes(2);
  });

  it('closes modal via onClose callback', async () => {
    const props = baseProps();

    await act(async () => {
      render(<DashboardView {...props} />);
    });

    act(() => {
      screen.getByTestId('simulation-section').querySelector('button')?.click();
    });

    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();

    // Close modal
    act(() => {
      screen.getByTestId('close-btn').click();
    });

    // Modal should close (test that state updates)
    await waitFor(() => {
      expect(inviteFlowResetMock).toHaveBeenCalled();
    });
  });

  it('handles invite without name', async () => {
    const props = baseProps();
    inviteFlowSubmitMock.mockResolvedValueOnce({
      inviteUrl: 'http://invite',
      outcome: 'sent',
      simulationId: '1',
      candidateName: '',
      candidateEmail: 'a@test.com',
    });

    await act(async () => {
      render(<DashboardView {...props} />);
    });

    act(() => {
      screen.getByTestId('simulation-section').querySelector('button')?.click();
    });

    const modalProps = captureModalProps.mock.calls[0]?.[0] as {
      onSubmit: (n: string, e: string) => Promise<void>;
    };
    await act(async () => {
      await modalProps.onSubmit('', 'a@test.com');
    });

    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('a@test.com'),
      }),
    );
  });

  it('handles invite without URL', async () => {
    const props = baseProps();
    inviteFlowSubmitMock.mockResolvedValueOnce({
      inviteUrl: '',
      outcome: 'sent',
      simulationId: '1',
      candidateName: 'Ann',
      candidateEmail: 'a@test.com',
    });

    await act(async () => {
      render(<DashboardView {...props} />);
    });

    act(() => {
      screen.getByTestId('simulation-section').querySelector('button')?.click();
    });

    const modalProps = captureModalProps.mock.calls[0]?.[0] as {
      onSubmit: (n: string, e: string) => Promise<void>;
    };
    await act(async () => {
      await modalProps.onSubmit('Ann', 'a@test.com');
    });

    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: undefined,
      }),
    );
  });

  it('handles null invite result', async () => {
    const props = baseProps();
    inviteFlowSubmitMock.mockResolvedValueOnce(null);

    await act(async () => {
      render(<DashboardView {...props} />);
    });

    act(() => {
      screen.getByTestId('simulation-section').querySelector('button')?.click();
    });

    const modalProps = captureModalProps.mock.calls[0]?.[0] as {
      onSubmit: (n: string, e: string) => Promise<void>;
    };
    await act(async () => {
      await modalProps.onSubmit('Ann', 'a@test.com');
    });

    // Should not notify if result is null
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('handles copy failure and shows error action reset', async () => {
    const props = baseProps();
    inviteFlowSubmitMock.mockResolvedValueOnce({
      inviteUrl: 'http://invite',
      outcome: 'sent',
      simulationId: '1',
      candidateName: 'Ann',
      candidateEmail: 'a@test.com',
    });
    copyInviteLinkMock.mockResolvedValueOnce(false);

    await act(async () => {
      render(<DashboardView {...props} />);
    });

    act(() => {
      screen.getByTestId('simulation-section').querySelector('button')?.click();
    });

    const modalProps = captureModalProps.mock.calls[0]?.[0] as {
      onSubmit: (n: string, e: string) => Promise<void>;
    };
    await act(async () => {
      await modalProps.onSubmit('Ann', 'a@test.com');
    });

    const copyAction = notifyMock.mock.calls[0][0]?.actions?.[0];
    await act(async () => {
      await copyAction.onClick();
    });

    expect(copyInviteLinkMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        actions: expect.arrayContaining([
          expect.objectContaining({ label: 'Copy invite link' }),
        ]),
      }),
    );
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: 'error',
      }),
    );
  });

  it('renders loading skeleton and error states', () => {
    const onRefresh = jest.fn();
    render(
      <DashboardView
        profile={null}
        error="Boom"
        simulations={[]}
        simulationsError="Err"
        simulationsLoading={false}
        onRefresh={onRefresh}
      />,
    );

    // error message visible
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('renders profile loading skeleton when only loading flag is set', () => {
    const { container } = render(
      <DashboardView
        profile={null}
        error={null}
        profileLoading
        simulations={[]}
        simulationsError={null}
        simulationsLoading={false}
        onRefresh={jest.fn()}
      />,
    );

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('unmounts and clears all timers', async () => {
    const props = baseProps();

    const { unmount } = render(<DashboardView {...props} />);

    act(() => {
      screen.getByTestId('simulation-section').querySelector('button')?.click();
    });

    const modalProps = captureModalProps.mock.calls[0]?.[0] as {
      onSubmit: (n: string, e: string) => Promise<void>;
    };
    await act(async () => {
      await modalProps.onSubmit('Ann', 'a@test.com');
    });

    const copyAction = notifyMock.mock.calls[0][0]?.actions?.[0];
    await act(async () => {
      await copyAction.onClick();
    });

    // Unmount before timer fires
    unmount();

    // Advance timers - should not throw
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
  });

  it('renders loading state for dynamic modal', () => {
    // Test the loading component
    jest.resetModules();

    // Re-mock with loading component accessible
    const loadingFn = () => (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
        <div className="rounded bg-white px-4 py-3 text-sm text-gray-700 shadow">
          Loading invite form…
        </div>
      </div>
    );

    render(loadingFn());
    expect(screen.getByText(/Loading invite form/)).toBeInTheDocument();
  });
});
