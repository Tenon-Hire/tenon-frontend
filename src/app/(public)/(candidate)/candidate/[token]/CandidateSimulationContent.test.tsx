import { fireEvent, render, screen } from "@testing-library/react";
import CandidateSimulationContent from "./CandidateSimulationContent";
import { CandidateSessionProvider } from "../CandidateSessionProvider";

function renderWithProvider(ui: React.ReactNode) {
  return render(<CandidateSessionProvider>{ui}</CandidateSessionProvider>);
}

function mockFetchJsonOnce(status: number, body?: unknown) {
  const isOk = status >= 200 && status < 300;

  const response = {
    ok: isOk,
    status,
    headers: {
      get: (key: string) =>
        key.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: async () => body,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  };

  (global.fetch as unknown as jest.Mock).mockResolvedValueOnce(response);
}

describe("CandidateSimulationContent", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    sessionStorage.clear();
    (global.fetch as unknown as jest.Mock) = jest.fn();
  });

  it("valid token loads intro screen with correct title/role and start button", async () => {
    mockFetchJsonOnce(200, {
      candidateSessionId: 123,
      status: "in_progress",
      simulation: { title: "Backend Engineer Simulation", role: "Backend Engineer" },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    expect(await screen.findByText("Backend Engineer Simulation")).toBeInTheDocument();
    expect(screen.getByText(/Role:\s*Backend Engineer/i)).toBeInTheDocument();

    const startBtn = screen.getByRole("button", { name: /start simulation/i });
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);
    expect(await screen.findByText(/Starting/i)).toBeInTheDocument();
  });

  it("invalid token shows friendly error and no task UI", async () => {
    mockFetchJsonOnce(404, { message: "Not found" });

    renderWithProvider(<CandidateSimulationContent token="INVALID_TOKEN" />);

    expect(await screen.findByText(/Unable to load simulation/i)).toBeInTheDocument();
    expect(screen.getByText(/invite link is invalid/i)).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /start simulation/i })
    ).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("network errors show retry and retry succeeds", async () => {
    (global.fetch as unknown as jest.Mock)
      .mockRejectedValueOnce(new Error("network down"));

    mockFetchJsonOnce(200, {
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
});
