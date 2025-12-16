import { apiClient, login } from "./apiClient";
import { getAuthToken } from "./auth";

jest.mock("./auth", () => ({
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
});
