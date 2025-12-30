import { jest } from '@jest/globals';
import { responseHelpers } from '../setup';

const jsonRes = (
  body: unknown,
  status?: number,
  headers?: Record<string, string>,
) => responseHelpers.jsonResponse(body, status, headers) as unknown as Response;
type FetchMock = jest.MockedFunction<typeof fetch>;

const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

async function importApi() {
  jest.resetModules();
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.example.com';
  return import('@/lib/api/candidate');
}

describe('candidateApi', () => {
  afterAll(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
  });

  it('resolves invite token and normalizes response', async () => {
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
    const result = await resolveCandidateInviteToken('tok_123');

    expect(result.candidateSessionId).toBe(10);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/candidate/session/tok_123',
      expect.objectContaining({ method: 'GET', cache: 'no-store' }),
    );
  });

  it('throws HttpError with friendly message for invalid token', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ detail: 'Not found' }, 404));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken, HttpError } = await importApi();

    await expect(resolveCandidateInviteToken('bad')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(resolveCandidateInviteToken('bad')).rejects.toThrow(
      'invite link is invalid',
    );
  });

  it('fetches current task with candidate token header', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      jsonRes({
        isComplete: false,
        completedTaskIds: [1],
        currentTask: {
          id: 2,
          dayIndex: 2,
          type: 'code',
          title: 'Implement feature',
          description: 'Build it.',
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
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ 'x-candidate-token': 'token-abc' }),
      }),
    );
  });

  it('bubbles backend error messages for current task', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ message: 'Session missing' }, 500));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toMatchObject({
      status: 500,
      message: 'Session missing',
    });
  });

  it('submits candidate task payload and returns response', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      jsonRes({
        submissionId: 99,
        taskId: 7,
        candidateSessionId: 1,
        submittedAt: '2025-01-01T00:00:00Z',
        progress: { completed: 2, total: 5 },
        isComplete: false,
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask } = await importApi();

    const resp = await submitCandidateTask({
      taskId: 7,
      token: 'tok',
      candidateSessionId: 1,
      contentText: 'Answer',
    });

    expect(resp.progress.completed).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/tasks/7/submit',
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        headers: expect.objectContaining({
          'x-candidate-token': 'tok',
          'x-candidate-session-id': '1',
        }),
      }),
    );
  });

  it('throws specific HttpError on submit conflict', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ detail: 'Already submitted' }, 409));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask, HttpError } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 9,
        token: 'tok',
        candidateSessionId: 1,
        contentText: 'Body',
      }),
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      submitCandidateTask({
        taskId: 9,
        token: 'tok',
        candidateSessionId: 1,
        contentText: 'Body',
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Already submitted',
    });
  });

  it('wraps network errors in HttpError with status 0', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(9, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(9, 'tok')).rejects.toMatchObject({
      status: 0,
    });
  });

  it('throws expired errors for invite and submit paths', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock
      .mockResolvedValueOnce(jsonRes({ detail: 'Expired' }, 410))
      .mockResolvedValueOnce(jsonRes({ detail: 'Expired' }, 410));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken, submitCandidateTask, HttpError } =
      await importApi();

    await expect(resolveCandidateInviteToken('expired')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(resolveCandidateInviteToken('expired')).rejects.toMatchObject({
      status: 410,
    });

    await expect(
      submitCandidateTask({
        taskId: 1,
        token: 'tok',
        candidateSessionId: 2,
        contentText: 'hi',
      }),
    ).rejects.toThrow();
  });

  it('falls back to generic submit error when backend message is missing', async () => {
    const badJson = {
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
      json: async () => {
        throw new Error('no json');
      },
      text: async () => '{}',
    };
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(badJson as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask, HttpError } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 9,
        token: 'tok',
        candidateSessionId: 1,
        contentText: 'Body',
      }),
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      submitCandidateTask({
        taskId: 9,
        token: 'tok',
        candidateSessionId: 1,
        contentText: 'Body',
      }),
    ).rejects.toMatchObject({
      status: 500,
      message: 'Something went wrong submitting your task.',
    });
  });

  it('returns expired error for current task', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ detail: 'Expired session' }, 410));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toMatchObject({
      status: 410,
      message: 'That invite link has expired.',
    });
  });

  it('handles submit errors for 400 and 404 with backend message', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock
      .mockResolvedValueOnce(jsonRes({ detail: 'Out of order' }, 400))
      .mockResolvedValueOnce(jsonRes({ message: 'Session mismatch' }, 404));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 1,
        token: 't',
        candidateSessionId: 1,
        contentText: 'x',
      }),
    ).rejects.toMatchObject({ status: 400, message: 'Out of order' });

    await expect(
      submitCandidateTask({
        taskId: 2,
        token: 't',
        candidateSessionId: 1,
        contentText: 'y',
      }),
    ).rejects.toMatchObject({ status: 404, message: 'Session mismatch' });
  });

  it('uses generic task load message when response body is not an object', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes([], 500));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toMatchObject({
      message: 'Something went wrong loading your current task.',
    });
  });

  it('prefers detail when message is blank in submit error', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      jsonRes({ message: '   ', detail: 'Out of order detail' }, 400),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 5,
        token: 'tok',
        candidateSessionId: 1,
        contentText: 'x',
      }),
    ).rejects.toMatchObject({ message: 'Out of order detail' });
  });

  it('returns generic current task error when parseError cannot parse', async () => {
    const badRes = {
      ok: false,
      status: 502,
      headers: { get: () => 'application/json' },
      json: async () => {
        throw new Error('bad json');
      },
      text: async () => 'html error',
    };
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(badRes as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toMatchObject({
      message: 'Something went wrong loading your current task.',
    });
  });

  it('uses backend detail on current task failure', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ detail: 'Not allowed' }, 500));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(3, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(3, 'tok')).rejects.toMatchObject({
      message: 'Not allowed',
    });
  });

  it('uses text fallback for current task backend errors', async () => {
    const textRes = {
      ok: false,
      status: 500,
      headers: { get: () => 'text/plain' },
      json: async () => {
        throw new Error('no json');
      },
      text: async () => 'Server down',
    };
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(textRes as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(99, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(99, 'tok')).rejects.toMatchObject({
      status: 500,
      message: 'Something went wrong loading your current task.',
    });
  });

  it('returns expired error for current task', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ detail: 'Expired session' }, 410));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toMatchObject({
      status: 410,
      message: 'That invite link has expired.',
    });
  });

  it('handles submit errors for 400 and 404 with backend message', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock
      .mockResolvedValueOnce(jsonRes({ detail: 'Out of order' }, 400))
      .mockResolvedValueOnce(jsonRes({ message: 'Session mismatch' }, 404));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 1,
        token: 't',
        candidateSessionId: 1,
        contentText: 'x',
      }),
    ).rejects.toMatchObject({ status: 400, message: 'Out of order' });

    await expect(
      submitCandidateTask({
        taskId: 2,
        token: 't',
        candidateSessionId: 1,
        contentText: 'y',
      }),
    ).rejects.toMatchObject({ status: 404, message: 'Session mismatch' });
  });

  it('uses default message for bootstrap errors when backend silent', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({}, 500));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken, HttpError } = await importApi();

    await expect(resolveCandidateInviteToken('oops')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(resolveCandidateInviteToken('oops')).rejects.toMatchObject({
      status: 500,
      message: 'Something went wrong loading your simulation.',
    });
  });

  it('passes through submitCandidateCodeTask wrapper', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      jsonRes({
        submissionId: 3,
        taskId: 9,
        candidateSessionId: 1,
        submittedAt: '2025-01-01T00:00:00Z',
        progress: { completed: 1, total: 5 },
        isComplete: false,
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateCodeTask } = await importApi();
    const resp = await submitCandidateCodeTask({
      taskId: 9,
      token: 'tok',
      candidateSessionId: 1,
      codeBlob: '//',
    });

    expect(resp.taskId).toBe(9);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('uses backend detail when bootstrap fails with details payload', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ detail: 'Backend down' }, 500));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken, HttpError } = await importApi();

    await expect(resolveCandidateInviteToken('tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(resolveCandidateInviteToken('tok')).rejects.toMatchObject({
      status: 500,
      message: 'Backend down',
    });
  });

  it('returns network error status 0 when submit fails to reach server', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockRejectedValue(new TypeError('network down'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask, HttpError } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 1,
        token: 'tok',
        candidateSessionId: 2,
        contentText: 'hi',
      }),
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      submitCandidateTask({
        taskId: 1,
        token: 'tok',
        candidateSessionId: 2,
        contentText: 'hi',
      }),
    ).rejects.toMatchObject({ status: 0 });
  });

  it('wraps unknown errors with fallback HttpError in bootstrap', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockRejectedValue('boom');
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken, HttpError } = await importApi();

    await expect(resolveCandidateInviteToken('tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(resolveCandidateInviteToken('tok')).rejects.toMatchObject({
      status: 500,
      message: 'Something went wrong loading your simulation.',
    });
  });

  it('wraps unknown errors with fallback HttpError for current task and submit', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockRejectedValue('boom');
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, submitCandidateTask, HttpError } =
      await importApi();

    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toMatchObject({
      status: 500,
      message: 'Something went wrong loading your current task.',
    });

    await expect(
      submitCandidateTask({
        taskId: 1,
        token: 'tok',
        candidateSessionId: 1,
      }),
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      submitCandidateTask({
        taskId: 1,
        token: 'tok',
        candidateSessionId: 1,
      }),
    ).rejects.toMatchObject({
      status: 500,
      message: 'Something went wrong submitting your task.',
    });
  });

  it('handles current task TypeError branch', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockRejectedValue(new TypeError('offline'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask } = await importApi();

    await expect(getCandidateCurrentTask(1, 'tok')).rejects.toMatchObject({
      status: 0,
    });
  });

  it('handles current task 404 branch with backend detail', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ detail: 'Missing session' }, 404));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(2, 'tok')).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getCandidateCurrentTask(2, 'tok')).rejects.toMatchObject({
      status: 404,
      message: 'Missing session',
    });
  });

  it('handles submit 410 expired branch', async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(jsonRes({ detail: 'Expired session' }, 410));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask, HttpError } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 9,
        token: 'tok',
        candidateSessionId: 1,
      }),
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      submitCandidateTask({
        taskId: 9,
        token: 'tok',
        candidateSessionId: 1,
      }),
    ).rejects.toMatchObject({ status: 410 });
  });
});
