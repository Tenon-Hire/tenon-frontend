import Button from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import type { CandidateWorkspaceStatus } from '@/features/candidate/api';

type Props = {
  workspace: CandidateWorkspaceStatus | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  message: string;
};

export function WorkspacePanelBody({
  workspace,
  loading,
  error,
  notice,
  refreshing,
  onRefresh,
  message,
}: Props) {
  const repoLabel = workspace?.repoFullName ?? workspace?.repoName;
  const cta = workspace?.codespaceUrl
    ? { href: workspace.codespaceUrl, label: 'Open Codespace' }
    : workspace?.repoUrl
      ? { href: workspace.repoUrl, label: 'Open Repo' }
      : null;

  if (loading) {
    return (
      <div className="mt-4 space-y-2 text-sm text-gray-600">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56 bg-gray-100" />
        <Skeleton className="h-3 w-48 bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <div>{error}</div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="secondary" onClick={onRefresh}>
            {refreshing ? 'Refreshing…' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 text-sm text-gray-700">
      {notice ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}
      <div>{message}</div>
      {repoLabel ? <div>Repo: {repoLabel}</div> : null}
      {workspace?.repoUrl ? (
        <div className="break-all text-xs text-gray-600">
          Repo URL:{' '}
          <a
            aria-label="Repo URL"
            className="text-blue-600 hover:underline"
            href={workspace.repoUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {workspace.repoUrl}
          </a>
        </div>
      ) : null}
      {cta ? (
        <a
          className="block text-blue-600 hover:underline"
          href={cta.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {cta.label}
        </a>
      ) : null}
    </div>
  );
}
