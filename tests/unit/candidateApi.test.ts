import { jest } from "@jest/globals";

type MockResponseBody = string | Record<string, unknown> | Array<unknown>;

function makeResponse(
  body: MockResponseBody,
  status = 200,
  headers: Record<string, string> = { "content-type": "application/json" }
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? headers[name] ?? null,
    },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

type FetchMock = jest.MockedFunction<typeof fetch>;

const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

async function importApi() {
  jest.resetModules();
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.example.com";
  return import("@/lib/candidateApi");
}

describe("candidateApi", () => {
  afterAll(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
  });

  it("resolves invite token and normalizes response", async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      makeResponse({
        candidateSessionId: 10,
        status: "in_progress",
        simulation: { title: "Backend Sim", role: "Backend" },
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken } = await importApi();
    const result = await resolveCandidateInviteToken("tok_123");

    expect(result.candidateSessionId).toBe(10);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.example.com/candidate/session/tok_123",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
  });

  it("throws HttpError with friendly message for invalid token", async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(makeResponse({ detail: "Not found" }, 404));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken, HttpError } = await importApi();

    await expect(resolveCandidateInviteToken("bad")).rejects.toBeInstanceOf(HttpError);
    await expect(resolveCandidateInviteToken("bad")).rejects.toThrow("invite link is invalid");
  });

  it("fetches current task with candidate token header", async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      makeResponse({
        isComplete: false,
        completedTaskIds: [1],
        currentTask: {
          id: 2,
          dayIndex: 2,
          type: "code",
          title: "Implement feature",
          description: "Build it.",
        },
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask } = await importApi();

    const result = await getCandidateCurrentTask(44, "token-abc");

    expect(result.currentTask?.id).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.example.com/candidate/session/44/current_task",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ "x-candidate-token": "token-abc" }),
      })
    );
  });

  it("bubbles backend error messages for current task", async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(makeResponse({ message: "Session missing" }, 500));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(1, "tok")).rejects.toBeInstanceOf(HttpError);
    await expect(getCandidateCurrentTask(1, "tok")).rejects.toMatchObject({
      status: 500,
      message: "Session missing",
    });
  });

  it("submits candidate task payload and returns response", async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(
      makeResponse({
        submissionId: 99,
        taskId: 7,
        candidateSessionId: 1,
        submittedAt: "2025-01-01T00:00:00Z",
        progress: { completed: 2, total: 5 },
        isComplete: false,
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask } = await importApi();

    const resp = await submitCandidateTask({
      taskId: 7,
      token: "tok",
      candidateSessionId: 1,
      contentText: "Answer",
    });

    expect(resp.progress.completed).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.example.com/tasks/7/submit",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          "x-candidate-token": "tok",
          "x-candidate-session-id": "1",
        }),
      })
    );
  });

  it("throws specific HttpError on submit conflict", async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(makeResponse({ detail: "Already submitted" }, 409));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask, HttpError } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 9,
        token: "tok",
        candidateSessionId: 1,
        contentText: "Body",
      })
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      submitCandidateTask({
        taskId: 9,
        token: "tok",
        candidateSessionId: 1,
        contentText: "Body",
      })
    ).rejects.toMatchObject({
      status: 409,
      message: "Already submitted",
    });
  });

  it("wraps network errors in HttpError with status 0", async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getCandidateCurrentTask, HttpError } = await importApi();

    await expect(getCandidateCurrentTask(9, "tok")).rejects.toBeInstanceOf(HttpError);
    await expect(getCandidateCurrentTask(9, "tok")).rejects.toMatchObject({
      status: 0,
    });
  });

  it("throws expired errors for invite and submit paths", async () => {
    const fetchMock = jest.fn() as FetchMock;
    fetchMock
      .mockResolvedValueOnce(makeResponse({ detail: "Expired" }, 410))
      .mockResolvedValueOnce(makeResponse({ detail: "Expired" }, 410));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { resolveCandidateInviteToken, submitCandidateTask, HttpError } =
      await importApi();

    await expect(resolveCandidateInviteToken("expired")).rejects.toBeInstanceOf(HttpError);
    await expect(resolveCandidateInviteToken("expired")).rejects.toMatchObject({
      status: 410,
    });

    await expect(
      submitCandidateTask({
        taskId: 1,
        token: "tok",
        candidateSessionId: 2,
        contentText: "hi",
      })
    ).rejects.toThrow();
  });

  it("falls back to generic submit error when backend message is missing", async () => {
    const badJson = {
      ok: false,
      status: 500,
      headers: { get: () => "application/json" },
      json: async () => {
        throw new Error("no json");
      },
      text: async () => "{}",
    };
    const fetchMock = jest.fn() as FetchMock;
    fetchMock.mockResolvedValue(badJson as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const { submitCandidateTask, HttpError } = await importApi();

    await expect(
      submitCandidateTask({
        taskId: 9,
        token: "tok",
        candidateSessionId: 1,
        contentText: "Body",
      })
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      submitCandidateTask({
        taskId: 9,
        token: "tok",
        candidateSessionId: 1,
        contentText: "Body",
      })
    ).rejects.toMatchObject({
      status: 500,
      message: "Something went wrong submitting your task.",
    });
  });
});
