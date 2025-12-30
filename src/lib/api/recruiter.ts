import { apiClient, safeRequest } from './httpClient';
import { getId, getNumber, getString, isRecord } from './utils/normalize';

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

export type CreateSimulationInput = {
  title: string;
  role: string;
  techStack: string;
  seniority: 'Junior' | 'Mid' | 'Senior';
  focus?: string;
};

export type CreateSimulationResponse = {
  id: string;
};

function normalizeSimulation(raw: unknown): SimulationListItem {
  if (!isRecord(raw)) {
    return {
      id: '',
      title: 'Untitled simulation',
      role: 'Unknown role',
      createdAt: new Date().toISOString(),
    };
  }

  const id = getId(raw.id ?? raw.simulationId ?? raw.simulation_id);
  const title = getString(
    raw.title ?? raw.simulation_title,
    'Untitled simulation',
  );
  const role = getString(raw.role ?? raw.role_name, 'Unknown role');
  const createdAt = getString(
    raw.createdAt ?? raw.created_at,
    new Date().toISOString(),
  );

  const candidateCount =
    getNumber(raw.candidateCount) ??
    getNumber(raw.candidate_count) ??
    getNumber(raw.numCandidates) ??
    getNumber(raw.num_candidates) ??
    undefined;

  return { id, title, role, createdAt, candidateCount };
}

export async function listSimulations(): Promise<SimulationListItem[]> {
  const data = await apiClient.get<unknown>('/simulations');
  if (!Array.isArray(data)) return [];
  return data.map(normalizeSimulation);
}

export async function listSimulationsSafe() {
  return safeRequest<SimulationListItem[]>('/simulations');
}

function normalizeInviteResponse(raw: unknown): InviteCandidateResponse {
  if (!isRecord(raw)) {
    return { candidateSessionId: '', token: '', inviteUrl: '' };
  }

  return {
    candidateSessionId: getString(
      raw.candidateSessionId ?? raw.candidate_session_id,
      '',
    ),
    token: getString(raw.token, ''),
    inviteUrl: getString(raw.inviteUrl ?? raw.invite_url, ''),
  };
}

export async function inviteCandidate(
  simulationId: string,
  candidateName: string,
  inviteEmail: string,
): Promise<InviteCandidateResponse> {
  const safeId = simulationId.trim();
  const safeName = candidateName.trim();
  const safeEmail = inviteEmail.trim();

  if (!safeId || !safeName || !safeEmail) {
    return { candidateSessionId: '', token: '', inviteUrl: '' };
  }

  const data = await apiClient.post<unknown>(`/simulations/${safeId}/invite`, {
    candidateName: safeName,
    inviteEmail: safeEmail,
  });

  return normalizeInviteResponse(data);
}

function normalizeCreateSimulationResponse(
  raw: unknown,
): CreateSimulationResponse {
  if (!isRecord(raw)) return { id: '' };
  const id = getId(raw.id ?? raw.simulationId ?? raw.simulation_id);
  return { id };
}

export async function createSimulation(
  input: CreateSimulationInput,
): Promise<CreateSimulationResponse> {
  const safeTitle = input.title.trim();
  const safeRole = input.role.trim();
  const safeTechStack = input.techStack.trim();

  if (!safeTitle || !safeRole || !safeTechStack) {
    return { id: '' };
  }

  const data = await apiClient.post<unknown>('/simulations', {
    title: safeTitle,
    role: safeRole,
    techStack: safeTechStack,
    seniority: input.seniority,
    focus: input.focus?.trim() ? input.focus.trim() : undefined,
  });

  return normalizeCreateSimulationResponse(data);
}
