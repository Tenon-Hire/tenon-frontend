import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import CandidateSubmissionsContent from "@/app/(private)/(recruiter)/dashboard/simulations/[id]/candidates/[candidateSessionId]/CandidateSubmissionsContent";

let mockParams: Record<string, string> = { id: "1", candidateSessionId: "2" };

jest.mock("next/navigation", () => ({
  useParams: () => mockParams,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  headers: { get: (_k: string) => string | null };
};

function mockJsonResponse(body: unknown, status = 200): MockResponse {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => text,
    headers: { get: () => "application/json" },
  };
}

function mockTextResponse(body: string, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new Error("Invalid JSON");
    },
    text: async () => body,
    headers: { get: () => "text/plain" },
  };
}

function getUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

let anchorClickSpy: jest.SpyInstance | null = null;

describe("CandidateSubmissionsContent", () => {
  beforeAll(() => {
    anchorClickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    anchorClickSpy?.mockRestore();
  });

  it("renders available submissions for an incomplete candidate", async () => {
    mockParams = { id: "1", candidateSessionId: "2" };

    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);

        if (url === "/api/simulations/1/candidates") {
          return mockJsonResponse([
            {
              candidateSessionId: 2,
              inviteEmail: "jane@example.com",
              candidateName: "Jane Doe",
              status: "in_progress",
              startedAt: "2025-12-23T18:57:00.000000Z",
              completedAt: null,
              hasReport: false,
            },
          ]);
        }

        if (url.startsWith("/api/submissions?candidateSessionId=2")) {
          return mockJsonResponse({
            items: [
              {
                submissionId: 6,
                candidateSessionId: 2,
                taskId: 6,
                dayIndex: 1,
                type: "design",
                submittedAt: "2025-12-23T18:57:10.981202Z",
              },
            ],
          });
        }

        if (url === "/api/submissions/6") {
          return mockJsonResponse({
            submissionId: 6,
            candidateSessionId: 2,
            task: {
              taskId: 6,
              dayIndex: 1,
              type: "design",
              title: "Architecture & Planning",
              prompt: "Describe your approach",
            },
            contentText: "Here is my architecture plan...",
            code: null,
            testResults: null,
            submittedAt: "2025-12-23T18:57:10.981202Z",
          });
        }

        return mockTextResponse("Not found", 404);
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    expect(screen.getByText("Loading submissions…")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes("Day 1:") && content.includes("Architecture & Planning")
        )
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Text answer")).toBeInTheDocument();
    expect(
      screen.getByText("Here is my architecture plan...")
    ).toBeInTheDocument();
  });

  it("renders multiple submissions and includes code content when present", async () => {
    mockParams = { id: "1", candidateSessionId: "2" };

    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);

        if (url === "/api/simulations/1/candidates") {
          return mockJsonResponse([
            {
              candidateSessionId: 2,
              inviteEmail: "jane@example.com",
              candidateName: "Jane Doe",
              status: "completed",
              startedAt: "2025-12-23T18:00:00.000000Z",
              completedAt: "2025-12-23T19:00:00.000000Z",
              hasReport: false,
            },
          ]);
        }

        if (url.startsWith("/api/submissions?candidateSessionId=2")) {
          return mockJsonResponse({
            items: [
              {
                submissionId: 6,
                candidateSessionId: 2,
                taskId: 6,
                dayIndex: 1,
                type: "design",
                submittedAt: "2025-12-23T18:57:10.981202Z",
              },
              {
                submissionId: 7,
                candidateSessionId: 2,
                taskId: 7,
                dayIndex: 2,
                type: "code",
                submittedAt: "2025-12-23T18:57:19.035314Z",
              },
            ],
          });
        }

        if (url === "/api/submissions/6") {
          return mockJsonResponse({
            submissionId: 6,
            candidateSessionId: 2,
            task: {
              taskId: 6,
              dayIndex: 1,
              type: "design",
              title: "Architecture & Planning",
              prompt: null,
            },
            contentText: "Design response",
            code: null,
            testResults: null,
            submittedAt: "2025-12-23T18:57:10.981202Z",
          });
        }

        if (url === "/api/submissions/7") {
          return mockJsonResponse({
            submissionId: 7,
            candidateSessionId: 2,
            task: {
              taskId: 7,
              dayIndex: 2,
              type: "code",
              title: "Feature Implementation",
              prompt: null,
            },
            contentText: null,
            code: {
              blob: "console.log('hello from candidate');",
              repoPath: null,
            },
            testResults: null,
            submittedAt: "2025-12-23T18:57:19.035314Z",
          });
        }

        return mockTextResponse("Not found", 404);
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes("Day 1:") && content.includes("Architecture & Planning")
        )
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText((content) =>
        content.includes("Day 2:") && content.includes("Feature Implementation")
      )
    ).toBeInTheDocument();

    expect(screen.getByText("Code")).toBeInTheDocument();
    expect(
      screen.getByText("console.log('hello from candidate');")
    ).toBeInTheDocument();

    const writeText = jest.fn().mockRejectedValue(new Error("clipboard blocked"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const createObjectURL = jest.fn().mockReturnValue("blob://mock");
    const revokeObjectURL = jest.fn();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectURL,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: revokeObjectURL,
      writable: true,
      configurable: true,
    });

    const downloadBtn = screen.getByRole("button", { name: "Download" });
    const copyBtn = screen.getByRole("button", { name: "Copy code" });

    await waitFor(async () => {
      copyBtn.click();
      downloadBtn.click();
    });

    expect(writeText).toHaveBeenCalledWith("console.log('hello from candidate');");
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();

    Object.defineProperty(URL, "createObjectURL", {
      value: originalCreateObjectURL,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: originalRevokeObjectURL,
      writable: true,
      configurable: true,
    });
  });

  it("renders empty state when candidate has no submissions", async () => {
    mockParams = { id: "1", candidateSessionId: "2" };

    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);

        if (url === "/api/simulations/1/candidates") {
          return mockJsonResponse([
            {
              candidateSessionId: 2,
              inviteEmail: "jane@example.com",
              candidateName: "Jane Doe",
              status: "not_started",
              startedAt: null,
              completedAt: null,
              hasReport: false,
            },
          ]);
        }

        if (url.startsWith("/api/submissions?candidateSessionId=2")) {
          return mockJsonResponse({ items: [] });
        }

        return mockTextResponse("Not found", 404);
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    await waitFor(() => {
      expect(
        screen.getByText("No submissions yet for this candidate.")
      ).toBeInTheDocument();
    });
  });

  it("renders error state when submissions list request fails", async () => {
    mockParams = { id: "1", candidateSessionId: "2" };

    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);

        if (url === "/api/simulations/1/candidates") {
          return mockJsonResponse([
            {
              candidateSessionId: 2,
              inviteEmail: "jane@example.com",
              candidateName: "Jane Doe",
              status: "in_progress",
              startedAt: "2025-12-23T18:57:00.000000Z",
              completedAt: null,
              hasReport: false,
            },
          ]);
        }

        if (url.startsWith("/api/submissions?candidateSessionId=2")) {
          return mockJsonResponse({ message: "List failed" }, 500);
        }

        return mockTextResponse("Not found", 404);
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    await waitFor(() => {
      expect(screen.getByText("List failed")).toBeInTheDocument();
    });
  });

  it("shows fallback text when no content is captured in artifact", async () => {
    mockParams = { id: "1", candidateSessionId: "2" };

    const fetchMock = jest.fn(
      async (input: RequestInfo | URL): Promise<MockResponse> => {
        const url = getUrl(input);

        if (url === "/api/simulations/1/candidates") {
          return mockJsonResponse([
            {
              candidateSessionId: 2,
              inviteEmail: "jane@example.com",
              candidateName: "Jane Doe",
              status: "completed",
              startedAt: "2025-12-23T18:00:00.000000Z",
              completedAt: "2025-12-23T19:00:00.000000Z",
              hasReport: false,
            },
          ]);
        }

        if (url.startsWith("/api/submissions?candidateSessionId=2")) {
          return mockJsonResponse({
            items: [
              {
                submissionId: 9,
                candidateSessionId: 2,
                taskId: 9,
                dayIndex: 3,
                type: "design",
                submittedAt: "2025-12-23T18:57:10.981202Z",
              },
            ],
          });
        }

        if (url === "/api/submissions/9") {
          return mockJsonResponse({
            submissionId: 9,
            candidateSessionId: 2,
            task: {
              taskId: 9,
              dayIndex: 3,
              type: "design",
              title: "No Content Task",
              prompt: "Describe nothing",
            },
            contentText: null,
            code: { blob: "   ", repoPath: null },
            testResults: null,
            submittedAt: "2025-12-23T18:57:10.981202Z",
          });
        }

        return mockTextResponse("Not found", 404);
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes("Day 3:") && content.includes("No Content Task")
        )
      ).toBeInTheDocument();
    });

    expect(screen.getByText("No content captured for this submission.")).toBeInTheDocument();
  });
});
