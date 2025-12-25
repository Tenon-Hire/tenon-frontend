type TaskStatusProps = {
  displayStatus: 'idle' | 'submitting' | 'submitted';
  progress: { completed: number; total: number } | null;
};

export function TaskStatus({ displayStatus, progress }: TaskStatusProps) {
  return (
    <div className="mt-3 min-h-[20px] text-sm text-gray-600">
      {displayStatus === 'submitting' ? (
        <span>Submitting…</span>
      ) : displayStatus === 'submitted' ? (
        <span>
          Submitted ✓{' '}
          {progress
            ? `Progress: ${progress.completed}/${progress.total}`
            : null}
        </span>
      ) : null}
    </div>
  );
}
