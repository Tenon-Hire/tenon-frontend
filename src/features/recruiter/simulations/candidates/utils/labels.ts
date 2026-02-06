import { formatDateTime } from '@/shared/formatters';
import type { CandidateSession } from '@/features/recruiter/types';

export function buildSubmissionLabels({
  candidateSessionId,
  candidate,
}: {
  candidateSessionId: string;
  candidate: CandidateSession | null;
}) {
  const name =
    candidate?.candidateName ||
    candidate?.inviteEmail ||
    `Candidate ${candidateSessionId}`;
  const title = `${name} — Submissions`;

  const bits: string[] = [`CandidateSession: ${candidateSessionId}`];
  if (candidate?.status) bits.push(`Status: ${candidate.status}`);
  const started = formatDateTime(candidate?.startedAt);
  if (started) bits.push(`Started: ${started}`);
  const completed = formatDateTime(candidate?.completedAt);
  if (completed) bits.push(`Completed: ${completed}`);

  return { title, subtitle: bits.join(' • ') };
}
