'use client';

import { EmptyState } from '@/shared/ui/EmptyState';
import Button from '@/shared/ui/Button';

export function CandidatesEmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <EmptyState
      title="No candidates yet"
      description="Invite candidates to this simulation to track their progress and submissions."
      action={
        <Button variant="secondary" size="sm" onClick={onInvite}>
          Invite your first candidate
        </Button>
      }
    />
  );
}
