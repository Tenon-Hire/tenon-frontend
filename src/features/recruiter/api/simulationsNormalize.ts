import { getId, getNumber, getString, isRecord } from './simUtils';
import type { SimulationListItem, CreateSimulationResponse } from './types';
import { extractBackendMessage } from '@/lib/api/errors/errors';

export const normalizeSimulation = (raw: unknown): SimulationListItem => {
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
  const templateKey =
    typeof raw.templateKey === 'string'
      ? raw.templateKey
      : typeof raw.template_key === 'string'
        ? raw.template_key
        : null;
  return { id, title, role, createdAt, candidateCount, templateKey };
};

export const normalizeCreateSimulationResponse = (
  raw: unknown,
  status: number,
): CreateSimulationResponse => {
  if (!isRecord(raw)) return { ok: false, status, id: '' };
  const id = getId(raw.id ?? raw.simulationId ?? raw.simulation_id);
  const message =
    typeof raw.message === 'string'
      ? raw.message
      : typeof raw.detail === 'string'
        ? raw.detail
        : (extractBackendMessage(raw, true) ?? undefined);
  return {
    ok: status >= 200 && status < 300 && Boolean(id),
    status,
    id,
    message,
  };
};
