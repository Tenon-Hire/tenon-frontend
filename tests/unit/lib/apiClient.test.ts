import { apiClient, login } from "@/lib/apiClient";
import { getAuthToken } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  getAuthToken: jest.fn(),
}));

const fetchMock = jest.fn();

function makeResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
) {
  const status = init.status ?? 200;
  const headers = init.headers ?? { "content-type": "application/json" };

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        headers[name.toLowerCase()] ?? headers[name] ?? null,
    },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe("apiClient request helpers", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    (getAuthToken as jest.Mock).mockReset();
  });

  it("attaches auth token by default and normalizes URLs", async () => {
    (getAuthToken as jest.Mock).mockReturnValue("token-123");
    fetchMock.mockResolvedValue(makeResponse({ ok: true, data: { message: "hi" } }));

    await apiClient.get("/jobs");

    expect(fetchMock).toHaveBeenCalledWith("/api/jobs", {
      method: "GET",
      headers: { Authorization: "Bearer token-123" },
      body: undefined,
      credentials: "include",
    });
  });

  it("respects skipAuth and custom basePath", async () => {
    fetchMock.mockResolvedValue(makeResponse({ created: true, id: 7 }));

    await apiClient.post(
      "tasks",
      { title: "New" },
      { basePath: "https://api.example.com", skipAuth: true }
    );

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New" }),
      credentials: "include",
    });
  });

  it("does not stringify FormData bodies", async () => {
    const fd = new FormData();
    fd.append("file", "content");
    fetchMock.mockResolvedValue(makeResponse({ ok: true }));

    await apiClient.post("/upload", fd);

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.body).toBe(fd);
    expect(opts.headers).not.toHaveProperty("Content-Type");
  });

  it("extracts error messages from API errors", async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ detail: [{ msg: "Invalid password" }] }, { status: 422 })
    );

    await expect(login({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      message: "Invalid password",
      status: 422,
    });
  });

  it("falls back to status-based messages for text errors", async () => {
    fetchMock.mockResolvedValue(
      makeResponse("Internal error", {
        status: 500,
        headers: { "content-type": "text/plain" },
      })
    );

    await expect(apiClient.get("/oops")).rejects.toMatchObject({
      message: "Request failed with status 500",
      status: 500,
    });
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValue(makeResponse("", { status: 204, headers: {} }));

    const resp = await apiClient.delete("/noop");

    expect(resp).toBeUndefined();
  });

  it("handles malformed JSON bodies gracefully", async () => {
    const badJsonResponse = {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => {
        throw new Error("bad json");
      },
      text: async () => {
        throw new Error("should not call text");
      },
    } as unknown as Response;

    fetchMock.mockResolvedValue(badJsonResponse);

    const resp = await apiClient.get("/bad-json");
    expect(resp).toBeUndefined();
  });

  it("handles text body failures gracefully", async () => {
    const textFailResponse = {
      ok: true,
      status: 200,
      headers: { get: () => "text/plain" },
      json: async () => {
        throw new Error("not json");
      },
      text: async () => {
        throw new Error("text read failed");
      },
    } as unknown as Response;

    fetchMock.mockResolvedValue(textFailResponse);

    const resp = await apiClient.get("/text-fail");
    expect(resp).toBeUndefined();
  });

  it("uses explicit authToken and merges headers for put/patch/delete", async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse({ ok: true }))
      .mockResolvedValueOnce(makeResponse({ ok: true }))
      .mockResolvedValueOnce(makeResponse({ ok: true }));

    await apiClient.put(
      "/put-me",
      { a: 1 },
      { headers: { "X-Test": "one" } },
      { authToken: "custom-token" }
    );

    await apiClient.patch("/patch-me", { b: 2 }, { authToken: "custom-token" });
    await apiClient.delete("/delete-me", { headers: { "X-Req": "del" } });

    const putCall = fetchMock.mock.calls[0] as unknown[];
    const patchCall = fetchMock.mock.calls[1] as unknown[];
    const deleteCall = fetchMock.mock.calls[2] as unknown[];

    expect(putCall[0]).toBe("/api/put-me");
    expect(putCall[1]).toMatchObject({
      method: "PUT",
      headers: { Authorization: "Bearer custom-token", "Content-Type": "application/json", "X-Test": "one" },
    });

    expect(patchCall[1]).toMatchObject({
      method: "PATCH",
      headers: { Authorization: "Bearer custom-token", "Content-Type": "application/json" },
    });

    expect(deleteCall[1]).toMatchObject({
      method: "DELETE",
      headers: {},
    });
  });

  it("respects provided authToken even when window is defined", async () => {
    (getAuthToken as jest.Mock).mockReturnValue("ignored");
    fetchMock.mockResolvedValue(makeResponse({ ok: true }));

    await apiClient.get("/auth-pref", { authToken: "from-opts" });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth-pref", {
      method: "GET",
      headers: { Authorization: "Bearer from-opts" },
      body: undefined,
      credentials: "include",
    });
  });
});
