import { apiClient } from "./apiClient";

export type SimulationListItem = {
  id: string;
  title: string;
  role: string;
  createdAt: string;
  candidateCount?: number;
};

export type InviteCandidateResponse = {
  candidateSessionId: string;
  token: string;
  inviteUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function normalizeSimulation(raw: unknown): SimulationListItem {
  if (!isRecord(raw)) {
    return {
      id: "",
      title: "Untitled simulation",
      role: "Unknown role",
      createdAt: new Date().toISOString(),
    };
  }

  const id = getString(raw.id ?? raw.simulationId, "");
  const title = getString(raw.title ?? raw.simulation_title, "Untitled simulation");
  const role = getString(raw.role ?? raw.role_name, "Unknown role");
  const createdAt = getString(raw.createdAt ?? raw.created_at, new Date().toISOString());
  const candidateCount =
    getNumber(raw.candidateCount) ?? getNumber(raw.candidate_count) ?? undefined;

  return { id, title, role, createdAt, candidateCount };
}

export async function listSimulations(): Promise<SimulationListItem[]> {
  const data = await apiClient.get<unknown>("/simulations");
  if (!Array.isArray(data)) return [];
  return data.map(normalizeSimulation);
}

export async function inviteCandidate(simulationId: string): Promise<InviteCandidateResponse> {
  const data = await apiClient.post<unknown>(`/simulations/${simulationId}/invite`, {});

  if (!isRecord(data)) {
    return { candidateSessionId: "", token: "", inviteUrl: "" };
  }

  return {
    candidateSessionId: getString(data.candidateSessionId ?? data.candidate_session_id, ""),
    token: getString(data.token, ""),
    inviteUrl: getString(data.inviteUrl ?? data.invite_url, ""),
  };
}
