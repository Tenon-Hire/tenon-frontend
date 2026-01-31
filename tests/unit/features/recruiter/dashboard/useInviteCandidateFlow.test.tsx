import React, { forwardRef, useImperativeHandle } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { useInviteCandidateFlow } from '@/features/recruiter/dashboard/hooks/useInviteCandidateFlow';

const inviteCandidateMock = jest.fn();
const errorToMessageMock = jest.fn(() => 'friendly-error');

jest.mock('@/lib/api/recruiter', () => ({
  inviteCandidate: (...args: unknown[]) => inviteCandidateMock(...args),
}));

jest.mock('@/features/recruiter/utils/formatters', () => ({
  errorToMessage: (...args: unknown[]) => errorToMessageMock(...args),
}));

type HookReturn = ReturnType<typeof useInviteCandidateFlow>;

type HarnessProps = {
  simulation: { simulationId: string; simulationTitle: string } | null;
};

const HookHarness = forwardRef<HookReturn, HarnessProps>(
  function Harness(props, ref) {
    const hook = useInviteCandidateFlow(props.simulation);
    useImperativeHandle(ref, () => hook, [hook]);
    return null;
  },
);

describe('useInviteCandidateFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects empty simulation and missing name/email', async () => {
    const ref = React.createRef<HookReturn>();
    render(<HookHarness ref={ref} simulation={null} />);

    await act(async () => {
      const res = await ref.current?.submit('', '');
      expect(res).toBeNull();
      expect(ref.current?.state.status).toBe('idle');
    });

    render(
      <HookHarness
        ref={ref}
        simulation={{ simulationId: 'sim-1', simulationTitle: 'Sim' }}
      />,
    );
    await act(async () => {
      const res = await ref.current?.submit('', '');
      expect(res).toBeNull();
    });
    await waitFor(() => expect(ref.current?.state.status).toBe('error'));
    expect(ref.current?.state.message).toContain('required');
  });

  it('submits successfully and resets state', async () => {
    const ref = React.createRef<HookReturn>();
    inviteCandidateMock.mockResolvedValue({
      inviteUrl: 'http://invite',
      outcome: 'sent',
    });
    render(
      <HookHarness
        ref={ref}
        simulation={{ simulationId: 'sim-1', simulationTitle: 'Sim' }}
      />,
    );

    await act(async () => {
      const res = await ref.current?.submit('Ann', 'ann@test.com');
      expect(res).toMatchObject({
        inviteUrl: 'http://invite',
        outcome: 'sent',
        simulationId: 'sim-1',
        candidateName: 'Ann',
        candidateEmail: 'ann@test.com',
      });
    });
    expect(inviteCandidateMock).toHaveBeenCalledWith(
      'sim-1',
      'Ann',
      'ann@test.com',
    );
    expect(ref.current?.state.status).toBe('idle');
  });

  it('maps specific errors to friendly messages', async () => {
    const ref = React.createRef<HookReturn>();
    inviteCandidateMock.mockRejectedValue({
      status: 409,
      details: { error: { code: 'candidate_already_completed' } },
    });
    render(
      <HookHarness
        ref={ref}
        simulation={{ simulationId: 'sim-1', simulationTitle: 'Sim' }}
      />,
    );

    await act(async () => {
      const res = await ref.current?.submit('Bob', 'bob@test.com');
      expect(res).toBeNull();
    });
    expect(ref.current?.state.status).toBe('error');
    expect(ref.current?.state.message).toMatch(/already completed/i);

    inviteCandidateMock.mockRejectedValue({ status: 422 });
    await act(async () => {
      const res = await ref.current?.submit('Bob', 'bad');
      expect(res).toBeNull();
    });
    expect(ref.current?.state.message).toMatch(/valid email/i);

    inviteCandidateMock.mockRejectedValue({ status: 429 });
    await act(async () => {
      const res = await ref.current?.submit('Bob', 'bob@test.com');
      expect(res).toBeNull();
    });
    expect(ref.current?.state.message).toMatch(/Too many invites/i);

    inviteCandidateMock.mockRejectedValue({ status: 500 });
    await act(async () => {
      const res = await ref.current?.submit('Bob', 'bob@test.com');
      expect(res).toBeNull();
    });
    expect(errorToMessageMock).toHaveBeenCalled();
  });

  it('reset returns state to idle', () => {
    const ref = React.createRef<HookReturn>();
    render(
      <HookHarness
        ref={ref}
        simulation={{ simulationId: 'sim-1', simulationTitle: 'Sim' }}
      />,
    );
    act(() => ref.current?.reset());
    expect(ref.current?.state.status).toBe('idle');
  });
});
