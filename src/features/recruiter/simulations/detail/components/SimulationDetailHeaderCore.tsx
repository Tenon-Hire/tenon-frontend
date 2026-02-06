'use client';
import Link from 'next/link';
import Button from '@/shared/ui/Button';
import PageHeader from '@/shared/ui/PageHeader';

type Props = {
  simulationId: string;
  title: string;
  templateKey: string;
  onInvite: () => void;
};

export function SimulationDetailHeaderCore({
  simulationId,
  title,
  templateKey,
  onInvite,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <PageHeader
        title={title}
        subtitle={`Simulation ID: ${simulationId} · Template: ${templateKey}`}
      />
      <div className="flex items-center gap-2">
        <Button onClick={onInvite} size="sm">
          Invite candidate
        </Button>
        <Link
          className="text-sm text-blue-600 hover:underline"
          href="/dashboard"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
