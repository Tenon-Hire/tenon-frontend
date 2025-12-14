import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CandidateSimulationContent from "./CandidateSimulationContent";
import { CandidateSessionProvider } from "../CandidateSessionProvider";
import {
  HttpError,
  resolveCandidateInviteToken,
  getCandidateCurrentTask,
  submitCandidateTask,
} from "@/lib/candidateApi";

jest.mock("@/lib/candidateApi", () => {
  const actual = jest.requireActual("@/lib/candidateApi");
  return {
    __esModule: true,
    ...actual,
    resolveCandidateInviteToken: jest.fn(),
    getCandidateCurrentTask: jest.fn(),
    submitCandidateTask: jest.fn(),
  };
});

type MockTask = { id: number; dayIndex: number; type: string; title: string; description: string };
type MockTaskViewProps = {
  task: MockTask;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (payload: { contentText?: string; codeBlob?: string }) => void | Promise<void>;
};

jest.mock("@/components/candidate/TaskView", () => ({
  __esModule: true,
  default: function MockTaskView({ task, submitting, onSubmit }: MockTaskViewProps) {
    return (
      <div>
        <div data-testid="mock-task-title">{task.title}</div>

        <button
          type="button"
          disabled={submitting}
          onClick={() =>
            onSubmit(
              task.type === "code" || task.type === "debug" ? { codeBlob: "//" } : { contentText: "ok" }
            )
          }
        >
          Submit & Continue
        </button>

        <button type="button" disabled={submitting} onClick={() => onSubmit({ contentText: "   " })}>
          Submit empty
        </button>

        <button type="button" disabled={submitting} onClick={() => onSubmit({ codeBlob: "   " })}>
          Submit empty code
        </button>
      </div>
    );
  },
}));

const resolveMock = resolveCandidateInviteToken as unknown as jest.Mock;
const currentTaskMock = getCandidateCurrentTask as unknown as jest.Mock;
const submitMock = submitCandidateTask as unknown as jest.Mock;

function renderWithProvider(ui: React.ReactNode) {
  return render(<CandidateSessionProvider>{ui}</CandidateSessionProvider>);
}

const STORAGE_KEY = "simuhire:candidate_session_v1";

function seedSessionStorage(value: unknown) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

describe("CandidateSimulationContent", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    sessionStorage.clear();
  });

  it("valid token loads intro screen with correct title/role and start button, then loads current task", async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: "in_progress",
      simulation: { title: "Backend Engineer Simulation", role: "Backend Engineer" },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 101,
        dayIndex: 1,
        type: "design",
        title: "Day 1 — Architecture",
        description: "Describe your approach.",
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    expect(await screen.findByText("Backend Engineer Simulation")).toBeInTheDocument();
    expect(screen.getByText(/Role:\s*Backend Engineer/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /start simulation/i }));

    expect(await screen.findByText("Day 1 — Architecture")).toBeInTheDocument();
  });

  it("invalid token shows friendly error and no task UI", async () => {
    resolveMock.mockRejectedValueOnce(new HttpError(404, "Not found"));

    renderWithProvider(<CandidateSimulationContent token="INVALID_TOKEN" />);

    expect(await screen.findByText(/Unable to load simulation/i)).toBeInTheDocument();
    expect(screen.getByText(/invite link is invalid/i)).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /start simulation/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("network errors show retry and retry succeeds", async () => {
    resolveMock
      .mockRejectedValueOnce(new HttpError(0, "Network error. Please check your connection and try again."))
      .mockResolvedValueOnce({
        candidateSessionId: 999,
        status: "in_progress",
        simulation: { title: "Sim", role: "Backend Engineer" },
      });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    expect(await screen.findByText(/Unable to load simulation/i)).toBeInTheDocument();
    expect(screen.getByText(/Network error/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Sim")).toBeInTheDocument();
    expect(screen.getByText(/Role:\s*Backend Engineer/i)).toBeInTheDocument();
  });

  it("submitting a design/documentation task uses contentText payload", async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: "in_progress",
      simulation: { title: "Sim", role: "Backend Engineer" },
    });

    currentTaskMock
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [],
        currentTask: {
          id: 101,
          dayIndex: 1,
          type: "design",
          title: "Unique Day 1 Title",
          description: "Design it.",
        },
      })
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [101],
        currentTask: {
          id: 102,
          dayIndex: 2,
          type: "code",
          title: "Unique Day 2 Title",
          description: "Implement it.",
        },
      });

    submitMock.mockResolvedValueOnce({ ok: true });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(await screen.findByRole("button", { name: /start simulation/i }));

    expect(await screen.findByText("Unique Day 1 Title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /submit & continue/i }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const arg = submitMock.mock.calls[0]?.[0];

    expect(arg).toMatchObject({
      taskId: 101,
      token: "VALID_TOKEN",
      candidateSessionId: 123,
      contentText: "ok",
    });

    expect(await screen.findByText("Unique Day 2 Title")).toBeInTheDocument();
  });

  it("empty text submission shows validation error and does not call submit endpoint", async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: "in_progress",
      simulation: { title: "Sim", role: "Backend Engineer" },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 101,
        dayIndex: 1,
        type: "design",
        title: "Unique Day 1 Title",
        description: "Design it.",
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(await screen.findByRole("button", { name: /start simulation/i }));
    expect(await screen.findByText("Unique Day 1 Title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^submit empty$/i }));

    expect(submitMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/please enter an answer before submitting/i)).toBeInTheDocument();
  });

  it("empty code submission shows validation error and does not call submit endpoint", async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: "in_progress",
      simulation: { title: "Sim", role: "Backend Engineer" },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 102,
        dayIndex: 2,
        type: "code",
        title: "Unique Day 2 Title",
        description: "Implement it.",
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(await screen.findByRole("button", { name: /start simulation/i }));
    expect(await screen.findByText("Unique Day 2 Title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^submit empty code$/i }));

    expect(submitMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/please write some code before submitting/i)).toBeInTheDocument();
  });

  it("after submitting Day 1, progress advances to Day 2", async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: "in_progress",
      simulation: { title: "Sim", role: "Backend Engineer" },
    });

    currentTaskMock
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [],
        currentTask: {
          id: 101,
          dayIndex: 1,
          type: "design",
          title: "Unique Day 1 Title",
          description: "Design it.",
        },
      })
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [101],
        currentTask: {
          id: 102,
          dayIndex: 2,
          type: "code",
          title: "Unique Day 2 Title",
          description: "Implement it.",
        },
      });

    submitMock.mockResolvedValueOnce({ ok: true });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(await screen.findByRole("button", { name: /start simulation/i }));
    expect(await screen.findByText("Unique Day 1 Title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /submit & continue/i }));

    expect(await screen.findByText("Unique Day 2 Title")).toBeInTheDocument();
  });

  it("after completing all 5 tasks, UI shows completion state", async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: "in_progress",
      simulation: { title: "Sim", role: "Backend Engineer" },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: true,
      completedTaskIds: [1, 2, 3, 4, 5],
      currentTask: null,
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(await screen.findByRole("button", { name: /start simulation/i }));

    expect(await screen.findByText(/Simulation complete/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit & continue/i })).not.toBeInTheDocument();
  });

  it("refresh retains progress (seeded started session loads current task without needing Start)", async () => {
    seedSessionStorage({
      token: "VALID_TOKEN",
      bootstrap: {
        candidateSessionId: 123,
        status: "in_progress",
        simulation: { title: "Sim", role: "Backend Engineer" },
      },
      started: true,
      taskState: {
        loading: false,
        error: null,
        isComplete: false,
        completedTaskIds: [],
        currentTask: null,
      },
    });

    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: "in_progress",
      simulation: { title: "Sim", role: "Backend Engineer" },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [101, 102],
      currentTask: {
        id: 103,
        dayIndex: 3,
        type: "debug",
        title: "Unique Day 3 Title",
        description: "Debug it.",
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    expect(screen.queryByRole("button", { name: /start simulation/i })).not.toBeInTheDocument();
    expect(await screen.findByText("Unique Day 3 Title")).toBeInTheDocument();
    expect(currentTaskMock).toHaveBeenCalled();
  });
});
