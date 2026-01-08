import { act, renderHook } from '@testing-library/react';
import { useInviteCandidateFlow } from '@/features/recruiter/dashboard/hooks/useInviteCandidateFlow';
import { inviteCandidate } from '@/lib/api/recruiter';

jest.mock('@/lib/api/recruiter', () => ({
  inviteCandidate: jest.fn(),
}));

describe('useInviteCandidateFlow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('normalizes invite inputs safely before submitting', async () => {
    (inviteCandidate as jest.Mock).mockResolvedValueOnce({
      inviteUrl: '/invite/url',
      candidateSessionId: 'cs_1',
      token: 'tok',
    });

    const { result } = renderHook(() =>
      useInviteCandidateFlow({
        open: true,
        simulationId: ' sim-123 ',
        simulationTitle: 'Sim 123',
      }),
    );

    let response;
    await act(async () => {
      response = await result.current.submit(
        { currentTarget: { value: ' Jane ' } } as unknown as string,
        { value: 'USER@Example.com ' } as unknown as string,
      );
    });

    expect(inviteCandidate).toHaveBeenCalledWith(
      'sim-123',
      'Jane',
      'user@example.com',
    );
    expect(response).toEqual({
      inviteUrl: '/invite/url',
      simulationId: 'sim-123',
      candidateName: 'Jane',
      candidateEmail: 'user@example.com',
    });
  });

  it('shows a friendly error message when the API throws non-string data', async () => {
    (inviteCandidate as jest.Mock).mockRejectedValueOnce({ boom: true });

    const { result } = renderHook(() =>
      useInviteCandidateFlow({
        open: true,
        simulationId: 'sim-123',
        simulationTitle: 'Sim 123',
      }),
    );

    await act(async () => {
      await result.current.submit('Jane', 'jane@example.com');
    });

    expect(result.current.state.status).toBe('error');
    expect(result.current.state.message).toContain(
      'Failed to invite candidate',
    );
  });
});
