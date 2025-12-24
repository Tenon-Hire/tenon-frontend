import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateSimulationContent from "@/app/(private)/(recruiter)/dashboard/simulations/new/CreateSimulationContent";
import { createSimulation } from "@/lib/recruiterApi";

const pushMock = jest.fn();
const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

jest.mock("@/lib/recruiterApi", () => ({
  ...jest.requireActual("@/lib/recruiterApi"),
  createSimulation: jest.fn(),
}));

const createSimulationMock = createSimulation as jest.MockedFunction<typeof createSimulation>;

describe("CreateSimulationContent", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("validates required fields before submitting", async () => {
    const user = userEvent.setup();
    render(<CreateSimulationContent />);

    await user.clear(screen.getByLabelText(/Title/i));
    await user.clear(screen.getByLabelText(/Role/i));
    await user.clear(screen.getByLabelText(/Tech stack/i));

    await user.click(screen.getByRole("button", { name: /Create simulation/i }));

    expect(await screen.findByText(/Title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Role is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Tech stack is required/i)).toBeInTheDocument();
    expect(createSimulationMock).not.toHaveBeenCalled();
  });

  it("creates simulation and redirects to dashboard", async () => {
    const user = userEvent.setup();
    createSimulationMock.mockResolvedValueOnce({ id: "sim_123" });

    render(<CreateSimulationContent />);

    await user.type(screen.getByLabelText(/Title/i), " Backend Payments ");
    await user.clear(screen.getByLabelText(/Role/i));
    await user.type(screen.getByLabelText(/Role/i), " Backend Engineer ");
    await user.clear(screen.getByLabelText(/Tech stack/i));
    await user.type(screen.getByLabelText(/Tech stack/i), " Node + Postgres ");
    await user.type(screen.getByLabelText(/Focus /i), "Messaging focus");

    await user.click(screen.getByRole("button", { name: /Create simulation/i }));

    await waitFor(() => {
      expect(createSimulationMock).toHaveBeenCalledWith({
        title: "Backend Payments",
        role: "Backend Engineer",
        techStack: "Node + Postgres",
        seniority: "Mid",
        focus: "Messaging focus",
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows form error when backend returns no id", async () => {
    const user = userEvent.setup();
    createSimulationMock.mockResolvedValueOnce({ id: "" });

    render(<CreateSimulationContent />);

    await user.type(screen.getByLabelText(/Title/i), "Backend Sim");
    await user.click(screen.getByRole("button", { name: /Create simulation/i }));

    expect(await screen.findByText(/no id was returned/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to login on 401 response", async () => {
    const user = userEvent.setup();
    createSimulationMock.mockRejectedValueOnce({ status: 401 });

    render(<CreateSimulationContent />);

    await user.type(screen.getByLabelText(/Title/i), "Backend Sim");
    await user.click(screen.getByRole("button", { name: /Create simulation/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("surfaces backend error message on failure", async () => {
    const user = userEvent.setup();
    createSimulationMock.mockRejectedValueOnce({
      status: 500,
      body: { detail: "Server exploded" },
    });

    render(<CreateSimulationContent />);

    await user.type(screen.getByLabelText(/Title/i), "Backend Sim");
    await user.click(screen.getByRole("button", { name: /Create simulation/i }));

    expect(await screen.findByText(/Server exploded/i)).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
