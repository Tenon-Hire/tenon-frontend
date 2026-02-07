import type { TemplateKey } from '@/lib/templateCatalog';
import type { CandidateSession } from '@/features/recruiter/types';

export type SimulationListItem = {
  id: string;
  title: string;
  role: string;
  createdAt: string;
  candidateCount?: number;
  templateKey?: string | null;
};

export type InviteCandidateResponse = {
  candidateSessionId: string;
  token: string;
  inviteUrl: string;
  outcome: 'created' | 'resent';
};

export type CreateSimulationInput = {
  title: string;
  role: string;
  techStack: string;
  seniority: 'Junior' | 'Mid' | 'Senior';
  templateKey: TemplateKey;
  focus?: string;
};

export type CreateSimulationResponse = {
  ok: boolean;
  status?: number;
  message?: string;
  id: string;
};

export type ResendInviteResult = {
  ok: boolean;
  status: number;
  message?: string | null;
  retryAfterSeconds?: number | null;
  inviteEmailStatus?: string | null;
  rateLimited?: boolean;
  notFound?: boolean;
  body?: unknown;
};

export type CandidateListOptions = {
  signal?: AbortSignal;
  cache?: RequestCache;
  skipCache?: boolean;
  cacheTtlMs?: number;
  disableDedupe?: boolean;
};

export { CandidateSession };
