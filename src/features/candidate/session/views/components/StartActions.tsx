import Button from '@/components/ui/Button';

type Props = { onStart: () => void; onDashboard: () => void };

export function StartActions({ onStart, onDashboard }: Props) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-900">
        When you’re ready
      </div>
      <div className="mt-1 text-sm text-gray-700">
        Start Day 1 now. You can return anytime to continue where you left off.
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button onClick={onStart}>Start simulation</Button>
        <Button variant="secondary" onClick={onDashboard}>
          Back to Candidate Dashboard
        </Button>
      </div>
    </div>
  );
}
