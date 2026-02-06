import Button from '@/components/ui/Button';

type Props = {
  hasTask: boolean;
  onRetry: () => void;
  onDashboard: () => void;
};

export function TaskFallback({ hasTask, onRetry, onDashboard }: Props) {
  if (hasTask) {
    return (
      <div className="border rounded-md p-4 text-sm text-gray-700">
        Session not ready. Please refresh.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
      <div className="text-base font-semibold text-gray-900">
        Unable to load your session
      </div>
      <div className="text-sm text-gray-600">
        We couldn’t fetch your current task. Retry to refresh your workspace, or
        head back to the candidate dashboard to reopen your invite.
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onRetry}>Retry</Button>
        <Button variant="secondary" onClick={onDashboard}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
