'use client';
import Link from 'next/link';
import type { CandidateSession } from '@/types/recruiter';
import type { RowState } from '../hooks/types';
import { CandidateDateCell } from './CandidateDateCell';
import { CandidateDayProgressCell } from './CandidateDayProgressCell';
import { CandidateIdentityCell } from './CandidateIdentityCell';
import { CandidateInviteCell } from './CandidateInviteCell';
import { CandidateReportCell } from './CandidateReportCell';
import { CandidateStatusCell } from './CandidateStatusCell';
import { CandidateVerificationCell } from './CandidateVerificationCell';

type Props = {
  candidate: CandidateSession;
  simulationId: string;
  rowState: RowState;
  cooldownNow: number;
  onCopy: (candidate: CandidateSession) => void;
  onResend: (candidate: CandidateSession) => void;
  onCloseManual: (id: number) => void;
};

export function CandidateRow({
  candidate,
  simulationId,
  rowState,
  cooldownNow,
  onCopy,
  onResend,
  onCloseManual,
}: Props) {
  return (
    <tr data-testid={`candidate-row-${candidate.candidateSessionId}`}>
      <CandidateIdentityCell candidate={candidate} />
      <CandidateStatusCell candidate={candidate} />
      <CandidateReportCell candidate={candidate} />
      <CandidateInviteCell
        candidate={candidate}
        rowState={rowState}
        cooldownNow={cooldownNow}
        onCopy={onCopy}
        onResend={onResend}
        onCloseManual={onCloseManual}
      />
      <CandidateVerificationCell candidate={candidate} />
      <CandidateDayProgressCell candidate={candidate} />
      <CandidateDateCell value={candidate.startedAt} />
      <CandidateDateCell value={candidate.completedAt} />
      <td className="px-4 py-3 text-right align-top">
        <Link
          className="text-blue-600 hover:underline"
          href={`/dashboard/simulations/${simulationId}/candidates/${candidate.candidateSessionId}`}
        >
          View submissions →
        </Link>
      </td>
    </tr>
  );
}
