'use client';
import Button from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';

export function SubmissionsEmpty({ onRefresh }: { onRefresh: () => void }) {
  return (
    <EmptyState
      title="No submissions yet"
      description="The candidate hasn’t submitted work for this simulation yet. Refresh to check for new activity."
      action={
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      }
    />
  );
}
