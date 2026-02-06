import { StatusPill } from '@/components/ui/StatusPill';
import { statusMeta } from '@/features/shared/status/statusMeta';

type TaskStatusProps = {
  displayStatus: 'idle' | 'submitting' | 'submitted';
  progress: { completed: number; total: number } | null;
};

export function TaskStatus({ displayStatus, progress }: TaskStatusProps) {
  if (displayStatus === 'idle') return <div className="mt-3 min-h-[20px]" />;

  const meta = statusMeta(displayStatus);
  return (
    <div className="mt-3 flex min-h-[20px] items-center gap-2 text-sm text-gray-600">
      <StatusPill label={meta.label} tone={meta.tone} />
      {displayStatus === 'submitted' && progress ? (
        <span>
          Progress: {progress.completed}/{progress.total}
        </span>
      ) : null}
    </div>
  );
}
