import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useCandidateBootstrap } from '@/features/candidate/session/hooks/useCandidateBootstrap';

jest.mock('@/lib/api/candidate', () => {
  const actual = jest.requireActual('@/lib/api/candidate');
  return {
    __esModule: true,
    ...actual,
    resolveCandidateInviteToken: jest.fn(),
  };
});

const resolveMock = jest.requireMock('@/lib/api/candidate')
  .resolveCandidateInviteToken as jest.Mock;

function Harness({
  inviteToken,
  authToken,
  onResolved,
  onSetInviteToken,
}: {
  inviteToken: string | null;
  authToken: string | null;
  onResolved: jest.Mock;
  onSetInviteToken?: jest.Mock;
}) {
  const { state, errorMessage, load } = useCandidateBootstrap({
    inviteToken,
    authToken,
    onResolved,
    onSetInviteToken,
  });

  return (
    <div>
      <div data-testid="state">{state}</div>
      <div data-testid="error">{errorMessage ?? ''}</div>
      <button onClick={() => void load()}>load</button>
    </div>
  );
}

describe('useCandidateBootstrap', () => {
  beforeEach(() => {
    resolveMock.mockReset();
  });

  it('loads bootstrap successfully', async () => {
    const onResolved = jest.fn();
    const inviteToken = 'tok_123';
    resolveMock.mockResolvedValue({
      candidateSessionId: 9,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Eng' },
    });

    render(
      <Harness
        inviteToken={inviteToken}
        authToken="auth"
        onResolved={onResolved}
      />,
    );

    await act(async () => {
      screen.getByText('load').click();
    });

    expect(resolveMock).toHaveBeenCalledWith(inviteToken, 'auth');
    expect(onResolved).toHaveBeenCalledWith({
      candidateSessionId: 9,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Eng' },
    });
    expect(screen.getByTestId('state').textContent).toBe('ready');
  });

  it('surfaces error on failure', async () => {
    const onResolved = jest.fn();
    resolveMock.mockRejectedValue(
      Object.assign(new Error('bad'), { status: 404 }),
    );

    render(
      <Harness
        inviteToken="tok_err"
        authToken="auth"
        onResolved={onResolved}
      />,
    );

    await act(async () => {
      screen.getByText('load').click();
    });

    expect(onResolved).not.toHaveBeenCalled();
    expect(screen.getByTestId('state').textContent).toBe('error');
    expect(screen.getByTestId('error').textContent).toContain('invalid');
  });
});
