import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecruiterDashboardContent, { RecruiterProfile } from "./RecruiterDashboardContent";
import { inviteCandidate, listSimulations } from "@/lib/recruiterApi";

jest.mock("@/lib/recruiterApi", () => ({
  listSimulations: jest.fn(),
  inviteCandidate: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
}));


const mockedListSimulations = listSimulations as jest.MockedFunction<typeof listSimulations>;
const mockedInviteCandidate = inviteCandidate as jest.MockedFunction<typeof inviteCandidate>;

describe("RecruiterDashboardContent", () => {
  const profile: RecruiterProfile = {
    id: 1,
    name: "Jordan Doe",
    email: "jordan@example.com",
    role: "recruiter",
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders profile details when available", async () => {
    mockedListSimulations.mockResolvedValueOnce([]);

    render(<RecruiterDashboardContent profile={profile} error={null} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Jordan Doe")).toBeInTheDocument();
    expect(screen.getByText("jordan@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Role:/)).toHaveTextContent("Role: recruiter");

    expect(await screen.findByText("No simulations yet.")).toBeInTheDocument();
  });

  it("shows an error message when provided", async () => {
    mockedListSimulations.mockResolvedValueOnce([]);

    render(<RecruiterDashboardContent profile={null} error="Unable to fetch profile" />);

    expect(screen.getByText("Unable to fetch profile")).toBeInTheDocument();
    expect(await screen.findByText("No simulations yet.")).toBeInTheDocument();
  });

  it("shows empty state when recruiter has no simulations", async () => {
    mockedListSimulations.mockResolvedValueOnce([]);

    render(<RecruiterDashboardContent profile={null} error={null} />);

    expect(await screen.findByText("No simulations yet.")).toBeInTheDocument();
  });

  it("renders simulations list with metadata", async () => {
    mockedListSimulations.mockResolvedValueOnce([
      {
        id: "sim_1",
        title: "Backend Engineer - Node",
        role: "Backend Engineer",
        createdAt: "2025-12-10T10:00:00Z",
        candidateCount: 2,
      },
    ]);

    render(<RecruiterDashboardContent profile={null} error={null} />);

    expect(await screen.findByText("Backend Engineer - Node")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("2 candidate(s)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite candidate" })).toBeInTheDocument();
  });

  it("shows inline error state when listSimulations fails", async () => {
    mockedListSimulations.mockRejectedValueOnce({ message: "Unauthorized", status: 401 });

    render(<RecruiterDashboardContent profile={null} error={null} />);

    expect(await screen.findByText("Couldn’t load simulations")).toBeInTheDocument();
    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  });

  it("invites a candidate and displays invite url + token", async () => {
    const user = userEvent.setup();

    mockedListSimulations
      .mockResolvedValueOnce([
        { id: "sim_1", title: "Sim 1", role: "Backend", createdAt: "2025-12-10T10:00:00Z" },
      ])
      .mockResolvedValueOnce([
        { id: "sim_1", title: "Sim 1", role: "Backend", createdAt: "2025-12-10T10:00:00Z" },
      ]);

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: "cs_1",
      token: "tok_123",
      inviteUrl: "http://localhost:3000/candidate/tok_123",
    });

    render(<RecruiterDashboardContent profile={null} error={null} />);

    const inviteBtn = await screen.findByRole("button", { name: "Invite candidate" });
    await user.click(inviteBtn);

    await user.type(screen.getByLabelText(/Candidate name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/Candidate email/i), "jane@example.com");

    const createBtn = screen.getByRole("button", { name: /Create invite/i });
    await user.click(createBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(await screen.findByText("Invite created for Jane Doe (jane@example.com).")).toBeInTheDocument();

    expect(mockedInviteCandidate).toHaveBeenCalledWith("sim_1", "Jane Doe", "jane@example.com");
  });

});
