'use client';
import { useParams } from 'next/navigation';
import { useCandidateSubmissions } from './hooks/useCandidateSubmissions';
import { CandidateSubmissionsView } from './components/CandidateSubmissionsView';
import { buildSubmissionLabels } from './utils/labels';
export { ArtifactCard } from './components/ArtifactCard';

export default function CandidateSubmissionsPage() {
  const params = useParams<{ id: string; candidateSessionId: string }>();
  const simulationId = params.id;
  const candidateSessionId = params.candidateSessionId ?? '';
  const { state, actions, pagedItems, pageSize } = useCandidateSubmissions(
    simulationId,
    candidateSessionId,
  );

  const labels = buildSubmissionLabels({
    candidateSessionId,
    candidate: state.candidate,
  });

  return (
    <CandidateSubmissionsView
      simulationId={simulationId}
      labels={labels}
      state={state}
      actions={actions}
      pagedItems={pagedItems}
      pageSize={pageSize}
    />
  );
}
