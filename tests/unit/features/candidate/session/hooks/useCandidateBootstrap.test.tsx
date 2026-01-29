import React, { forwardRef, useImperativeHandle } from 'react';
import { render, act } from '@testing-library/react';
import { useCandidateBootstrap } from '@/features/candidate/session/hooks/useCandidateBootstrap';

const resolveCandidateInviteTokenMock = jest.fn();
const friendlyBootstrapErrorMock = jest.fn(
  (err: { status?: number } | null) => `friendly-${err?.status ?? 'unknown'}`,
);

jest.mock('@/lib/api/candidate', () => ({
  resolveCandidateInviteToken: (...args: unknown[]) =>
    resolveCandidateInviteTokenMock(...args),
}));

jest.mock('@/features/candidate/session/utils/errorMessages', () => {
  const actual = jest.requireActual(
    '@/features/candidate/session/utils/errorMessages',
  );
  return {
    ...actual,
    friendlyBootstrapError: (...args: unknown[]) =>
      friendlyBootstrapErrorMock(...args),
  };
});

type HookReturn = ReturnType<typeof useCandidateBootstrap>;

type HarnessProps = {
  inviteToken: string | null;
  authToken: string | null;
  onResolved: jest.Mock;
  onSetInviteToken?: jest.Mock;
};

const HookHarness = forwardRef<HookReturn, HarnessProps>(
  function HookHarness(props, ref) {
    const hook = useCandidateBootstrap(props);
    useImperativeHandle(ref, () => hook, [hook]);
    return null;
  },
);

const makeRef = () => React.createRef<HookReturn>();

describe('useCandidateBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops when auth token missing', async () => {
    const ref = makeRef();
    render(
      <HookHarness
        ref={ref}
        inviteToken={null}
        authToken={null}
        onResolved={jest.fn()}
      />,
    );

    await act(async () => {
      await ref.current?.load();
    });

    expect(resolveCandidateInviteTokenMock).not.toHaveBeenCalled();
    expect(ref.current?.state).toBe('idle');
  });

  it('sets error when invite token missing', async () => {
    const ref = makeRef();
    render(
      <HookHarness
        ref={ref}
        inviteToken={null}
        authToken="auth"
        onResolved={jest.fn()}
      />,
    );

    await act(async () => {
      await ref.current?.load();
    });

    expect(ref.current?.state).toBe('error');
    expect(ref.current?.errorMessage).toBe('Missing invite token.');
    expect(ref.current?.errorStatus).toBeNull();
  });

  it('calls resolve and marks ready on success, deduping in-flight', async () => {
    const onResolved = jest.fn();
    const onSetInviteToken = jest.fn();
    const ref = makeRef();
    let resolvePromise: (val: unknown) => void;
    const pending = new Promise((res) => {
      resolvePromise = res;
    });
    resolveCandidateInviteTokenMock.mockReturnValueOnce(
      pending as unknown as Promise<unknown>,
    );

    render(
      <HookHarness
        ref={ref}
        inviteToken="tok"
        authToken="auth"
        onResolved={onResolved}
        onSetInviteToken={onSetInviteToken}
      />,
    );

    await act(async () => {
      void ref.current?.load();
      // second call should be deduped while in-flight
      void ref.current?.load();
    });

    expect(resolveCandidateInviteTokenMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePromise?.({ ok: true });
    });

    expect(onResolved).toHaveBeenCalledWith({ ok: true });
    expect(onSetInviteToken).toHaveBeenCalledWith('tok');
    expect(ref.current?.state).toBe('ready');
    expect(ref.current?.errorMessage).toBeNull();
  });

  it('captures friendly error message and status on failure', async () => {
    const ref = makeRef();
    resolveCandidateInviteTokenMock.mockRejectedValue({
      status: 410,
      message: 'expired',
    });

    render(
      <HookHarness
        ref={ref}
        inviteToken="tok"
        authToken="auth"
        onResolved={jest.fn()}
      />,
    );

    await act(async () => {
      await ref.current?.load();
    });

    expect(ref.current?.state).toBe('error');
    expect(ref.current?.errorStatus).toBe(410);
    expect(friendlyBootstrapErrorMock).toHaveBeenCalled();
    expect(ref.current?.errorMessage).toContain('friendly');
  });
});
