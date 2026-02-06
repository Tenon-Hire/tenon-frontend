'use client';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { statusMeta } from '@/features/shared/status/statusMeta';

type Props = {
  title: string;
  subtitle: string;
  backHref: string;
  status?: string | null;
  inviteEmail?: string | null;
  onRefresh: () => void;
};

export function SubmissionsHeader({
  title,
  subtitle,
  backHref,
  status,
  inviteEmail,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-wrap items-center gap-2">
        {status ? (
          <StatusPill
            label={statusMeta(status).label}
            tone={statusMeta(status).tone}
          />
        ) : null}
        {inviteEmail ? (
          <span className="text-sm text-gray-600">{inviteEmail}</span>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          aria-label="reload-submissions"
        >
          Reload
        </Button>
        <Link className="text-sm text-blue-600 hover:underline" href={backHref}>
          ← Back to candidates
        </Link>
      </div>
    </div>
  );
}
