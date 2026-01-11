const mockPost = jest.fn();
const mockGet = jest.fn();

jest.mock('@/lib/api/httpClient', () => ({
  apiClient: {
    post: mockPost,
    get: mockGet,
  },
}));

const apiClient = jest.requireMock('@/lib/api/httpClient').apiClient as {
  post: jest.Mock;
  get: jest.Mock;
};

describe('candidate api helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    mockPost.mockReset();
    mockGet.mockReset();
  });

  it('throws when auth token is missing', async () => {
    const { claimCandidateInvite, HttpError } =
      await import('@/lib/api/candidate');
    await expect(claimCandidateInvite('token', '')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('parses successful invite claim response', async () => {
    apiClient.post.mockResolvedValueOnce({
      candidateSessionId: 12,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Eng' },
      invitedEmail: 'a@test.com',
      signedInEmail: 'b@test.com',
    });

    const { claimCandidateInvite } = await import('@/lib/api/candidate');
    const result = await claimCandidateInvite('abc', 'auth-token');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/candidate/session/abc/claim',
      undefined,
      { cache: 'no-store' },
      expect.objectContaining({ authToken: 'auth-token' }),
    );
    expect(result).toMatchObject({
      candidateSessionId: 12,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Eng' },
      invitedEmail: 'a@test.com',
      signedInEmail: 'b@test.com',
    });
  });

  it('sends verification code and returns masked email', async () => {
    apiClient.post.mockResolvedValueOnce({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    const { sendCandidateVerificationCode } =
      await import('@/lib/api/candidate');
    const result = await sendCandidateVerificationCode('abc');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/candidate/session/abc/verification/code/send',
      undefined,
      { cache: 'no-store' },
      expect.objectContaining({ skipAuth: true }),
    );
    expect(result).toMatchObject({
      status: 'sent',
      maskedEmail: 't***@example.com',
    });
  });

  it('sends verification code with email when provided', async () => {
    apiClient.post.mockResolvedValueOnce({
      status: 'sent',
      maskedEmail: 't***@example.com',
      expiresAt: '2025-01-01T00:00:00Z',
    });

    const { sendCandidateVerificationCode } =
      await import('@/lib/api/candidate');
    await sendCandidateVerificationCode('abc', 'user@example.com');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/candidate/session/abc/verification/code/send',
      { email: 'user@example.com' },
      { cache: 'no-store' },
      expect.objectContaining({ skipAuth: true }),
    );
  });

  it('attaches otp metadata for resend cooldown', async () => {
    apiClient.post.mockRejectedValueOnce({
      status: 429,
      details: { error: 'otp_cooldown', retryAfterSeconds: 12 },
    });

    const { sendCandidateVerificationCode } =
      await import('@/lib/api/candidate');

    await expect(sendCandidateVerificationCode('abc')).rejects.toMatchObject({
      status: 429,
      otpError: 'otp_cooldown',
      retryAfterSeconds: 12,
    });
  });

  it('normalizes otp metadata with alternate detail shapes', async () => {
    apiClient.post.mockRejectedValueOnce({
      status: 429,
      details: { otp_error: 'otp_locked', retry_after_seconds: 90 },
    });

    const { confirmCandidateVerificationCode } =
      await import('@/lib/api/candidate');

    await expect(
      confirmCandidateVerificationCode('abc', 'user@example.com', '123456'),
    ).rejects.toMatchObject({
      status: 429,
      otpError: 'otp_locked',
      retryAfterSeconds: 90,
    });
  });

  it('confirms verification code and returns access token', async () => {
    apiClient.post.mockResolvedValueOnce({
      verified: true,
      candidateAccessToken: 'candidate-token',
      expiresAt: '2025-01-02T00:00:00Z',
    });

    const { confirmCandidateVerificationCode } =
      await import('@/lib/api/candidate');
    const result = await confirmCandidateVerificationCode(
      'abc',
      'user@example.com',
      '123456',
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/candidate/session/abc/verification/code/confirm',
      { email: 'user@example.com', code: '123456' },
      { cache: 'no-store' },
      expect.objectContaining({ skipAuth: true }),
    );
    expect(result.candidateAccessToken).toBe('candidate-token');
  });

  it('maps backend errors to HttpError responses', async () => {
    const { claimCandidateInvite, HttpError } =
      await import('@/lib/api/candidate');

    apiClient.post.mockRejectedValueOnce({ status: 404 });
    await expect(claimCandidateInvite('abc', 'auth')).rejects.toMatchObject({
      status: 404,
      message: 'That invite link is invalid.',
    });

    apiClient.post.mockRejectedValueOnce({ status: 410 });
    await expect(claimCandidateInvite('abc', 'auth')).rejects.toMatchObject({
      status: 410,
      message: 'That invite link has expired.',
    });

    apiClient.post.mockRejectedValueOnce({
      status: 401,
      details: 'invited@test.com',
    });
    await expect(claimCandidateInvite('abc', 'auth')).rejects.toMatchObject({
      status: 401,
      invitedEmail: 'invited@test.com',
    });

    apiClient.post.mockRejectedValueOnce({});
    await expect(claimCandidateInvite('abc', 'auth')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('lists candidate invites and normalizes shape', async () => {
    mockGet.mockResolvedValueOnce([
      {
        candidate_session_id: 5,
        token: 'tok',
        title: 'Sim',
        role: 'Eng',
        company: 'Co',
        status: 'not_started',
        progress: { completed: 0, total: 3 },
        expiresAt: '2024-01-01',
      },
    ]);

    const { listCandidateInvites } = await import('@/lib/api/candidate');
    const invites = await listCandidateInvites('auth');

    expect(mockGet).toHaveBeenCalled();
    expect(invites[0]).toMatchObject({
      candidateSessionId: 5,
      token: 'tok',
      title: 'Sim',
      role: 'Eng',
    });
  });

  it('resolves invite token and maps 404 to HttpError', async () => {
    mockGet.mockRejectedValueOnce({ status: 404 });
    const { resolveCandidateInviteToken, HttpError } =
      await import('@/lib/api/candidate');

    await expect(
      resolveCandidateInviteToken('tok', 'auth'),
    ).rejects.toMatchObject({ status: 404 });

    await expect(resolveCandidateInviteToken('tok', '')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('resolves invite token and maps 410 to HttpError', async () => {
    mockGet.mockRejectedValueOnce({ status: 410 });
    const { resolveCandidateInviteToken } = await import('@/lib/api/candidate');

    await expect(
      resolveCandidateInviteToken('tok', 'auth'),
    ).rejects.toMatchObject({ status: 410 });
  });

  it('maps current task network errors to HttpError', async () => {
    mockGet.mockRejectedValueOnce(new TypeError('network'));
    const { getCandidateCurrentTask } = await import('@/lib/api/candidate');

    await expect(getCandidateCurrentTask(1, 'auth')).rejects.toMatchObject({
      status: 0,
    });
  });

  it('maps current task 404 errors with backend message', async () => {
    mockGet.mockRejectedValueOnce({ status: 404, details: 'missing' });
    const { getCandidateCurrentTask } = await import('@/lib/api/candidate');

    await expect(getCandidateCurrentTask(2, 'auth')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('maps current task 410 errors', async () => {
    mockGet.mockRejectedValueOnce({ status: 410 });
    const { getCandidateCurrentTask } = await import('@/lib/api/candidate');

    await expect(getCandidateCurrentTask(3, 'auth')).rejects.toMatchObject({
      status: 410,
    });
  });

  it('handles submitCandidateTask validation errors', async () => {
    mockPost.mockRejectedValueOnce({ status: 400 });
    const { submitCandidateTask } = await import('@/lib/api/candidate');

    await expect(
      submitCandidateTask({
        taskId: 1,
        token: 'auth',
        candidateSessionId: 1,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('handles submitCandidateTask conflict and network errors', async () => {
    mockPost.mockRejectedValueOnce({ status: 409, details: 'dup' });
    mockPost.mockRejectedValueOnce(new TypeError('offline'));
    const { submitCandidateTask } = await import('@/lib/api/candidate');

    await expect(
      submitCandidateTask({
        taskId: 2,
        token: 'auth',
        candidateSessionId: 2,
      }),
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      submitCandidateTask({
        taskId: 3,
        token: 'auth',
        candidateSessionId: 3,
      }),
    ).rejects.toMatchObject({ status: 0 });
  });

  it('handles submitCandidateTask session and expiration errors', async () => {
    mockPost.mockRejectedValueOnce({ status: 404, details: 'mismatch' });
    mockPost.mockRejectedValueOnce({ status: 410 });
    const { submitCandidateTask } = await import('@/lib/api/candidate');

    await expect(
      submitCandidateTask({
        taskId: 4,
        token: 'auth',
        candidateSessionId: 4,
      }),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      submitCandidateTask({
        taskId: 5,
        token: 'auth',
        candidateSessionId: 5,
      }),
    ).rejects.toMatchObject({ status: 410 });
  });

  it('returns empty list when invites response is not an array', async () => {
    mockGet.mockResolvedValueOnce({ not: 'array' });
    const { listCandidateInvites } = await import('@/lib/api/candidate');
    const invites = await listCandidateInvites('auth');
    expect(invites).toEqual([]);
  });

  it('propagates invite list errors as HttpError', async () => {
    mockGet.mockRejectedValueOnce(new Error('fetch'));
    const { listCandidateInvites, HttpError } =
      await import('@/lib/api/candidate');
    await expect(listCandidateInvites('auth')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('propagates resolve invite backend errors', async () => {
    mockGet.mockRejectedValueOnce({ status: 500, details: 'backend' });
    const { resolveCandidateInviteToken } = await import('@/lib/api/candidate');

    await expect(
      resolveCandidateInviteToken('tok', 'auth'),
    ).rejects.toMatchObject({ status: 500 });
  });

  it('maps current task generic errors', async () => {
    mockGet.mockRejectedValueOnce({ status: 500, details: 'fail' });
    const { getCandidateCurrentTask } = await import('@/lib/api/candidate');

    await expect(getCandidateCurrentTask(9, 'auth')).rejects.toMatchObject({
      status: 500,
    });
  });

  it('maps submitCandidateTask unknown errors via toHttpError', async () => {
    mockPost.mockRejectedValueOnce('oops');
    const { submitCandidateTask, HttpError } =
      await import('@/lib/api/candidate');

    await expect(
      submitCandidateTask({
        taskId: 6,
        token: 'auth',
        candidateSessionId: 6,
      }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('handles string session ids and missing simulation data', async () => {
    apiClient.post.mockResolvedValueOnce({
      candidate_session_id: '15',
      status: 'completed',
    });
    const { claimCandidateInvite } = await import('@/lib/api/candidate');

    const result = await claimCandidateInvite('tok', 'auth');
    expect(result.candidateSessionId).toBe(15);
    expect(result.simulation).toEqual({ title: '', role: '' });
  });

  it('throws when invite response is missing candidateSessionId', async () => {
    apiClient.post.mockResolvedValueOnce({ status: 'in_progress' });
    const { claimCandidateInvite, HttpError } =
      await import('@/lib/api/candidate');

    await expect(claimCandidateInvite('tok', 'auth')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('requires non-empty invite token', async () => {
    const { claimCandidateInvite, HttpError } =
      await import('@/lib/api/candidate');
    await expect(claimCandidateInvite('   ', 'auth')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('maps claimCandidateInvite unknown errors via toHttpError', async () => {
    apiClient.post.mockRejectedValueOnce('boom');
    const { claimCandidateInvite, HttpError } =
      await import('@/lib/api/candidate');

    await expect(claimCandidateInvite('tok', 'auth')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('normalizes candidate invites with missing data', async () => {
    const { normalizeCandidateInvite } = await import('@/lib/api/candidate');
    const normalized = normalizeCandidateInvite({
      id: 'NaN',
      inviteToken: '',
      status: 'expired',
      progress: { completed: 'one', total: 'two' },
    });

    expect(normalized.candidateSessionId).toBe(0);
    expect(normalized.token).toBeNull();
    expect(normalized.isExpired).toBe(true);
    expect(normalized.progress).toBeNull();
  });

  it('maps resolveCandidateInviteToken unknown errors via toHttpError', async () => {
    mockGet.mockRejectedValueOnce('wtf');
    const { resolveCandidateInviteToken, HttpError } =
      await import('@/lib/api/candidate');

    await expect(
      resolveCandidateInviteToken('tok', 'auth'),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('treats current task errors without numeric status as network issues', async () => {
    mockGet.mockRejectedValueOnce({ status: 'oops' });
    const { getCandidateCurrentTask } = await import('@/lib/api/candidate');

    await expect(getCandidateCurrentTask(1, 'auth')).rejects.toMatchObject({
      status: 0,
    });
  });

  it('maps current task unknown errors via toHttpError', async () => {
    mockGet.mockRejectedValueOnce('boom');
    const { getCandidateCurrentTask, HttpError } =
      await import('@/lib/api/candidate');

    await expect(getCandidateCurrentTask(1, 'auth')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('handles submitCandidateTask unexpected status with generic message', async () => {
    mockPost.mockRejectedValueOnce({ status: 418 });
    const { submitCandidateTask } = await import('@/lib/api/candidate');

    await expect(
      submitCandidateTask({
        taskId: 7,
        token: 'auth',
        candidateSessionId: 7,
      }),
    ).rejects.toMatchObject({
      status: 418,
      message: 'Something went wrong submitting your task.',
    });
  });

  it('submits code tasks through submitCandidateCodeTask wrapper', async () => {
    mockPost.mockResolvedValueOnce({ submissionId: 99 });
    const { submitCandidateCodeTask } = await import('@/lib/api/candidate');

    const result = await submitCandidateCodeTask({
      taskId: 9,
      token: 'auth',
      candidateSessionId: 9,
      codeBlob: 'blob',
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/tasks/9/submit',
      expect.objectContaining({ codeBlob: 'blob' }),
      expect.any(Object),
      expect.objectContaining({ authToken: 'auth' }),
    );
    expect(result).toEqual({ submissionId: 99 });
  });

  it('initializes workspace and normalizes response fields', async () => {
    mockPost.mockResolvedValueOnce({
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: 'https://codespaces.new/acme/repo',
    });

    const { initCandidateWorkspace } = await import('@/lib/api/candidate');
    const result = await initCandidateWorkspace({
      taskId: 11,
      token: 'auth',
      candidateSessionId: 77,
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/tasks/11/codespace/init',
      undefined,
      expect.objectContaining({
        headers: { 'x-candidate-session-id': '77' },
      }),
      expect.objectContaining({ authToken: 'auth' }),
    );
    expect(result).toEqual({
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: 'https://codespaces.new/acme/repo',
    });
  });

  it('fetches workspace status via codespace/status', async () => {
    mockGet.mockResolvedValueOnce({
      repoUrl: 'https://github.com/acme/repo2',
      repoName: 'acme/repo2',
    });

    const { getCandidateWorkspaceStatus } = await import('@/lib/api/candidate');
    const result = await getCandidateWorkspaceStatus({
      taskId: 12,
      token: 'auth',
      candidateSessionId: 88,
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/tasks/12/codespace/status',
      expect.objectContaining({
        headers: { 'x-candidate-session-id': '88' },
      }),
      expect.objectContaining({ authToken: 'auth' }),
    );
    expect(result).toEqual({
      repoUrl: 'https://github.com/acme/repo2',
      repoName: 'acme/repo2',
      codespaceUrl: null,
    });
  });

  it('starts and polls candidate test runs', async () => {
    mockPost.mockResolvedValueOnce({ runId: 'run-xyz' });
    mockGet.mockResolvedValueOnce({
      status: 'completed',
      conclusion: 'success',
      message: 'All green',
    });

    const { startCandidateTestRun, pollCandidateTestRun } =
      await import('@/lib/api/candidate');

    const start = await startCandidateTestRun({
      taskId: 13,
      token: 'auth',
      candidateSessionId: 99,
    });
    expect(start).toEqual({ runId: 'run-xyz' });

    const polled = await pollCandidateTestRun({
      taskId: 13,
      runId: 'run-xyz',
      token: 'auth',
      candidateSessionId: 99,
    });
    expect(polled).toEqual({ status: 'passed', message: 'All green' });
  });

  it('normalizes running, timeout, and error run statuses', async () => {
    mockGet
      .mockResolvedValueOnce({ status: 'running' })
      .mockResolvedValueOnce({ conclusion: 'timed_out' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: 'failed', message: 'Red' })
      .mockResolvedValueOnce({ status: 'completed', conclusion: 'failure' });

    const { pollCandidateTestRun } = await import('@/lib/api/candidate');

    const running = await pollCandidateTestRun({
      taskId: 14,
      runId: 'run-a',
      token: 'auth',
      candidateSessionId: 1,
    });
    expect(running).toEqual({ status: 'running', message: undefined });

    const timeout = await pollCandidateTestRun({
      taskId: 14,
      runId: 'run-b',
      token: 'auth',
      candidateSessionId: 1,
    });
    expect(timeout).toEqual({ status: 'timeout', message: undefined });

    const error = await pollCandidateTestRun({
      taskId: 14,
      runId: 'run-c',
      token: 'auth',
      candidateSessionId: 1,
    });
    expect(error).toEqual({ status: 'error' });

    const failed = await pollCandidateTestRun({
      taskId: 14,
      runId: 'run-d',
      token: 'auth',
      candidateSessionId: 1,
    });
    expect(failed).toEqual({ status: 'failed', message: 'Red' });

    const completedFailure = await pollCandidateTestRun({
      taskId: 14,
      runId: 'run-e',
      token: 'auth',
      candidateSessionId: 1,
    });
    expect(completedFailure).toEqual({
      status: 'failed',
      message: undefined,
    });
  });

  it('handles workspace and run network errors', async () => {
    mockPost.mockRejectedValueOnce(new TypeError('offline'));
    mockGet.mockRejectedValueOnce(new TypeError('offline'));
    mockPost.mockRejectedValueOnce(new TypeError('offline'));
    mockGet.mockRejectedValueOnce(new TypeError('offline'));

    const {
      initCandidateWorkspace,
      getCandidateWorkspaceStatus,
      startCandidateTestRun,
      pollCandidateTestRun,
    } = await import('@/lib/api/candidate');

    await expect(
      initCandidateWorkspace({
        taskId: 20,
        token: 'auth',
        candidateSessionId: 2,
      }),
    ).rejects.toMatchObject({ status: 0 });

    await expect(
      getCandidateWorkspaceStatus({
        taskId: 20,
        token: 'auth',
        candidateSessionId: 2,
      }),
    ).rejects.toMatchObject({ status: 0 });

    await expect(
      startCandidateTestRun({
        taskId: 21,
        token: 'auth',
        candidateSessionId: 3,
      }),
    ).rejects.toMatchObject({ status: 0 });

    await expect(
      pollCandidateTestRun({
        taskId: 21,
        runId: 'run-x',
        token: 'auth',
        candidateSessionId: 3,
      }),
    ).rejects.toMatchObject({ status: 0 });
  });

  it('throws when test run start response is missing a run id', async () => {
    mockPost.mockResolvedValueOnce({});
    const { startCandidateTestRun, HttpError } =
      await import('@/lib/api/candidate');

    await expect(
      startCandidateTestRun({
        taskId: 30,
        token: 'auth',
        candidateSessionId: 4,
      }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('propagates workspace and run status errors via toHttpError', async () => {
    mockPost.mockRejectedValueOnce({ status: 500 });
    mockGet.mockRejectedValueOnce({ status: 500 });
    mockGet.mockRejectedValueOnce({ status: 500 });

    const {
      initCandidateWorkspace,
      getCandidateWorkspaceStatus,
      pollCandidateTestRun,
      HttpError,
    } = await import('@/lib/api/candidate');

    await expect(
      initCandidateWorkspace({
        taskId: 40,
        token: 'auth',
        candidateSessionId: 4,
      }),
    ).rejects.toBeInstanceOf(HttpError);

    await expect(
      getCandidateWorkspaceStatus({
        taskId: 40,
        token: 'auth',
        candidateSessionId: 4,
      }),
    ).rejects.toBeInstanceOf(HttpError);

    await expect(
      pollCandidateTestRun({
        taskId: 41,
        runId: 'run-y',
        token: 'auth',
        candidateSessionId: 4,
      }),
    ).rejects.toBeInstanceOf(HttpError);
  });
});
