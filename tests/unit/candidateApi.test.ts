import { jest } from '@jest/globals';
import { responseHelpers } from '../setup';

const jsonRes = (
  body: unknown,
  status?: number,
  headers?: Record<string, string>,
) => responseHelpers.jsonResponse(body, status, headers) as unknown as Response;
type FetchMock = jest.MockedFunction<typeof fetch>;

const originalApiBase = process.env.NEXT_PUBLIC_TENON_API_BASE_URL;

async function importApi() {
  jest.resetModules();
  process.env.NEXT_PUBLIC_TENON_API_BASE_URL = 'http://api.example.com';
  return import('@/lib/api/candidate');
}

describe('candidateApi', () => {
  afterAll(() => {
    process.env.NEXT_PUBLIC_TENON_API_BASE_URL = originalApiBase;
  });

  it('resolves invite token with bearer auth', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      jsonRes({
        candidateSessionId: 10,
        status: 'in_progress',
        simulation: { title: 'Backend Sim', role: 'Backend' },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken } = await importApi();
    const result = await resolveCandidateInviteToken('tok_123', 'auth-token');

    expect(result.candidateSessionId).toBe(10);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/candidate/session/tok_123',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      }),
    );
  });

  it('requires auth token for bootstrap', async () => {
    const { resolveCandidateInviteToken, HttpError } = await importApi();
    await expect(
      resolveCandidateInviteToken('tok_123', ''),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('claims invite token with bearer auth', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      jsonRes({
        candidateSessionId: 99,
        status: 'in_progress',
        simulation: { title: 'Infra', role: 'Platform' },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { claimCandidateInvite } = await importApi();
    const result = await claimCandidateInvite('tok_123', 'auth-token');

    expect(result.candidateSessionId).toBe(99);
    expect(result.simulation.title).toBe('Infra');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/candidate/session/tok_123/claim',
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      }),
    );
  });

  it('requires bearer token for claim', async () => {
    const { claimCandidateInvite, HttpError } = await importApi();
    await expect(claimCandidateInvite('tok_123', '')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('lists candidate invites with bearer auth', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      jsonRes([
        {
          candidate_session_id: 9,
          simulationTitle: 'Design Sim',
          role_name: 'Designer',
          progress: { completed: 1, total: 5 },
          token: 'abc',
          expires_at: '2025-01-01',
          is_expired: true,
        },
      ]),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { listCandidateInvites } = await importApi();
    const invites = await listCandidateInvites('auth-token');

    expect(invites[0]).toMatchObject({
      candidateSessionId: 9,
      title: 'Design Sim',
      role: 'Designer',
      token: 'abc',
      progress: { completed: 1, total: 5 },
      isExpired: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/candidate/invites',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      }),
    );
  });

  it('surfaces bootstrap errors with status codes', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ detail: 'Invalid' }, 404));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken, HttpError } = await importApi();

    await expect(
      resolveCandidateInviteToken('bad', 'auth-token'),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('fetches current task with bearer and session headers', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      jsonRes({
        isComplete: false,
        completedTaskIds: [],
        currentTask: {
          id: 2,
          dayIndex: 1,
          type: 'design',
          title: 'Plan',
          description: 'Draw it',
        },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask } = await importApi();

    const result = await getCandidateCurrentTask(44, 'token-abc');
    expect(result.currentTask?.id).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/candidate/session/44/current_task',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-abc',
          'x-candidate-session-id': '44',
        }),
      }),
    );
  });

  it('requires bearer token for current task requests', async () => {
    const { getCandidateCurrentTask, HttpError } = await importApi();
    await expect(getCandidateCurrentTask(1, '')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('maps current task network failures to status 0', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockRejectedValue(new TypeError('offline'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask } = await importApi();

    await expect(getCandidateCurrentTask(10, 'token')).rejects.toMatchObject({
      status: 0,
    });
  });

  it('submits candidate task payload with session id header', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      jsonRes({
        submissionId: 3,
        taskId: 7,
        candidateSessionId: 1,
        submittedAt: '2025-01-01T00:00:00Z',
        progress: { completed: 1, total: 5 },
        isComplete: false,
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask } = await importApi();

    await submitCandidateTask({
      taskId: 7,
      token: 'token-abc',
      candidateSessionId: 1,
      contentText: 'Answer',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/tasks/7/submit',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-abc',
          'x-candidate-session-id': '1',
        }),
      }),
    );
  });

  it('requires bearer token for submitting tasks', async () => {
    const { submitCandidateTask, HttpError } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 7,
        token: '',
        candidateSessionId: 1,
        contentText: 'Answer',
      }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('surfaces submit errors for network TypeError', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockRejectedValue(new TypeError('offline'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 5,
        token: 'token-abc',
        candidateSessionId: 9,
        contentText: 'Ok',
      }),
    ).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('Network error'),
    });
  });

  it('maps submit 400/404/409/410 statuses to friendly messages', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock
      .mockResolvedValueOnce(jsonRes({ details: 'oops' }, 400))
      .mockResolvedValueOnce(jsonRes({ details: 'missing' }, 404))
      .mockResolvedValueOnce(jsonRes({ details: 'dup' }, 409))
      .mockResolvedValueOnce(jsonRes({ details: 'expired' }, 410));
    global.fetch = fetchMock as unknown as typeof fetch;
    const { submitCandidateTask, HttpError } = await importApi();

    const commonParams = {
      taskId: 5,
      token: 'token-abc',
      candidateSessionId: 9,
      contentText: 'Ok',
    };

    await expect(submitCandidateTask(commonParams)).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(submitCandidateTask(commonParams)).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(submitCandidateTask(commonParams)).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(submitCandidateTask(commonParams)).rejects.toBeInstanceOf(
      HttpError,
    );
  });
});
