import type { CandidateSession } from '@/types/recruiter';
import type { RowState } from '../hooks/types';
import { CandidateRow } from './CandidateRow';

type Props = {
  pagedCandidates: CandidateSession[];
  rowStateFor: (id: number) => RowState;
  cooldownNow: number;
  simulationId: string;
  onCopy: (candidate: CandidateSession) => void;
  onResend: (candidate: CandidateSession) => void;
  onCloseManual: (id: number) => void;
};

const columns = [
  'Candidate',
  'Status',
  'Report',
  'Invite email',
  'Verification',
  'Day progress',
  'Started',
  'Completed',
  '',
];

export function CandidatesTableBody({
  pagedCandidates,
  rowStateFor,
  cooldownNow,
  simulationId,
  onCopy,
  onResend,
  onCloseManual,
}: Props) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-left text-gray-600">
        <tr>
          {columns.map((col, idx) => (
            <th key={col || idx} className="px-4 py-3">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {pagedCandidates.map((candidate) => (
          <CandidateRow
            key={candidate.candidateSessionId}
            candidate={candidate}
            simulationId={simulationId}
            rowState={rowStateFor(candidate.candidateSessionId)}
            cooldownNow={cooldownNow}
            onCopy={onCopy}
            onResend={onResend}
            onCloseManual={onCloseManual}
          />
        ))}
      </tbody>
    </table>
  );
}
