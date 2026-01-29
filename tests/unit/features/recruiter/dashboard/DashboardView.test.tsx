import React from 'react';
import { render, screen, act } from '@testing-library/react';
import DashboardView from '@/features/recruiter/dashboard/DashboardView';

const notifyMock = jest.fn();
const updateMock = jest.fn();
const inviteFlowResetMock = jest.fn();
const inviteFlowSubmitMock = jest.fn();
const captureModalProps = jest.fn();

jest.mock('@/features/shared/notifications', () => ({
  useNotifications: () => ({ notify: notifyMock, update: updateMock }),
}));

jest.mock(
  '@/features/recruiter/dashboard/hooks/useInviteCandidateFlow',
  () => ({
    useInviteCandidateFlow: () => ({
      state: { status: 'idle' },
      submit: inviteFlowSubmitMock,
      reset: inviteFlowResetMock,
    }),
  }),
);

jest.mock('next/dynamic', () => {
  return (
    _importer: () => Promise<unknown>,
    opts: { loading?: () => JSX.Element },
  ) => {
    const Mock = (props: Record<string, unknown>) => {
      captureModalProps(props);
      return <div data-testid="invite-modal" />;
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
    }) => {
      const { simulations, loading, error, onInvite } = props;
      return (
        <div data-testid="simulation-section">
          <button onClick={() => onInvite?.({ id: '1', title: 'Sim 1' })}>
            invite
          </button>
          {JSON.stringify({ simulations, loading, error })}
        </div>
      );
    },
  }),
);

jest.mock('@/features/recruiter/utils/formatters', () => ({
  copyToClipboard: jest.fn(async () => true),
}));

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

describe('DashboardView', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
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
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders profile, simulations, and header', () => {
    act(() => {
      render(<DashboardView {...baseProps()} />);
    });
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByTestId('profile-card')).toHaveTextContent('Recruiter');
    expect(screen.getByTestId('simulation-section')).toBeInTheDocument();
  });

  it('shows loading skeleton and profile error states', () => {
    const props = baseProps();
    props.profile = null;
    props.profileLoading = true;
    const view = render(<DashboardView {...props} />);
    expect(view.container.querySelector('.animate-pulse')).toBeTruthy();

    props.profileLoading = false;
    props.error = 'profile failed';
    act(() => {
      render(<DashboardView {...props} />);
    });
    expect(screen.getByText(/profile failed/)).toBeInTheDocument();
  });

  it('opens invite modal and triggers invite submission', async () => {
    const props = baseProps();
    await act(async () => {
      render(<DashboardView {...props} />);
    });

    // simulate child onInvite call
    act(() =>
      screen.getByTestId('simulation-section').querySelector('button')?.click(),
    );

    expect(inviteFlowResetMock).toHaveBeenCalled();
    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();

    const modalProps = captureModalProps.mock.calls[0]?.[0] as
      | {
          onSubmit: (n: string, e: string) => Promise<void>;
        }
      | undefined;
    expect(modalProps).toBeDefined();
    await act(async () => {
      await modalProps?.onSubmit('Ann', 'a@test.com');
    });
    expect(inviteFlowSubmitMock).toHaveBeenCalledWith('Ann', 'a@test.com');
    expect(props.onRefresh).toHaveBeenCalled();
  });
});
