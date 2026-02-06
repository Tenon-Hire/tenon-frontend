import Button from '@/components/ui/Button';

type Props = {
  dayIndex: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

export function WorkspacePanelHeader({
  dayIndex,
  loading,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">
          Day {dayIndex} workspace
        </div>
        <div className="text-xs text-gray-600">
          Provisioned GitHub repo + Codespace link.
        </div>
      </div>
      <Button
        variant="secondary"
        onClick={onRefresh}
        disabled={loading || refreshing}
      >
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </Button>
    </div>
  );
}
