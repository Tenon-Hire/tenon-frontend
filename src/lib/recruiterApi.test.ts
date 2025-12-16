import { apiClient } from "./apiClient";
import { inviteCandidate, listSimulations } from "./recruiterApi";

jest.mock("./apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

type MockGet = (path: string) => Promise<unknown>;
type MockPost = (path: string, body?: unknown) => Promise<unknown>;

const mockedGet = apiClient.get as unknown as jest.MockedFunction<MockGet>;
const mockedPost = apiClient.post as unknown as jest.MockedFunction<MockPost>;

describe("recruiterApi", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("listSimulations", () => {
    it("calls GET /simulations", async () => {
      mockedGet.mockResolvedValueOnce([]);

      await listSimulations();

      expect(mockedGet).toHaveBeenCalledWith("/simulations");
    });

    it("returns empty array when response is not an array", async () => {
      mockedGet.mockResolvedValueOnce({});

      const result = await listSimulations();

      expect(result).toEqual([]);
    });

    it("normalizes camelCase fields", async () => {
      mockedGet.mockResolvedValueOnce([
        {
          id: "sim_1",
          title: "Sim One",
          role: "Backend Engineer",
          createdAt: "2025-12-10T10:00:00Z",
          candidateCount: 3,
        },
      ]);

      const result = await listSimulations();

      expect(result).toEqual([
        {
          id: "sim_1",
          title: "Sim One",
          role: "Backend Engineer",
          createdAt: "2025-12-10T10:00:00Z",
          candidateCount: 3,
        },
      ]);
    });

    it("normalizes snake_case fields", async () => {
      mockedGet.mockResolvedValueOnce([
        {
          id: "sim_2",
          title: "Sim Two",
          role: "Backend Engineer",
          created_at: "2025-12-11T10:00:00Z",
          candidate_count: 1,
        },
      ]);

      const result = await listSimulations();

      expect(result[0]?.id).toBe("sim_2");
      expect(result[0]?.title).toBe("Sim Two");
      expect(result[0]?.role).toBe("Backend Engineer");
      expect(result[0]?.createdAt).toBe("2025-12-11T10:00:00Z");
      expect(result[0]?.candidateCount).toBe(1);
    });

    it("falls back safely when item is not an object", async () => {
      mockedGet.mockResolvedValueOnce([null]);

      const result = await listSimulations();

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Untitled simulation");
      expect(result[0]?.role).toBe("Unknown role");
      expect(typeof result[0]?.createdAt).toBe("string");
    });
  });

  describe("inviteCandidate", () => {
    it("calls POST /simulations/{id}/invite with candidateName + inviteEmail", async () => {
      mockedPost.mockResolvedValueOnce({
        candidateSessionId: "cs_1",
        token: "tok_1",
        inviteUrl: "http://localhost:3000/candidate/tok_1",
      });

      await inviteCandidate("sim_1", "Jane Doe", "jane@example.com");

      expect(mockedPost).toHaveBeenCalledWith("/simulations/sim_1/invite", {
        candidateName: "Jane Doe",
        inviteEmail: "jane@example.com",
      });
    });

    it("normalizes invite response (camelCase)", async () => {
      mockedPost.mockResolvedValueOnce({
        candidateSessionId: "cs_1",
        token: "tok_1",
        inviteUrl: "http://localhost:3000/candidate/tok_1",
      });

      const result = await inviteCandidate("sim_1", "Jane Doe", "jane@example.com");

      expect(result).toEqual({
        candidateSessionId: "cs_1",
        token: "tok_1",
        inviteUrl: "http://localhost:3000/candidate/tok_1",
      });
    });

    it("normalizes invite response (snake_case)", async () => {
      mockedPost.mockResolvedValueOnce({
        candidate_session_id: "cs_2",
        token: "tok_2",
        invite_url: "http://localhost:3000/candidate/tok_2",
      });

      const result = await inviteCandidate("sim_2", "Jane Doe", "jane@example.com");

      expect(result).toEqual({
        candidateSessionId: "cs_2",
        token: "tok_2",
        inviteUrl: "http://localhost:3000/candidate/tok_2",
      });
    });

    it("returns blanks when response is not an object", async () => {
      mockedPost.mockResolvedValueOnce("not-an-object");

      const result = await inviteCandidate("sim_3", "Jane Doe", "jane@example.com");

      expect(result).toEqual({
        candidateSessionId: "",
        token: "",
        inviteUrl: "",
      });
    });
  });
});
