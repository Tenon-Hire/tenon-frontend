import type { CandidateSession, StatusPillTone } from '@/types/recruiter';

export type StatusMeta = {
  label: string;
  tone: StatusPillTone;
};

const STATUS_META: Record<
  NonNullable<CandidateSession['status']>,
  StatusMeta
> = {
  not_started: { label: 'Not started', tone: 'muted' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
};

export function statusMeta(status: CandidateSession['status']): StatusMeta {
  return STATUS_META[status] ?? { label: String(status), tone: 'muted' };
}
