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
});
