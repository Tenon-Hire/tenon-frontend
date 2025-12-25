import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/common/Button';

type DashboardHeaderProps = {
  onNewSimulation: () => void;
};

export function DashboardHeader({ onNewSimulation }: DashboardHeaderProps) {
  return (
    <PageHeader
      title="Dashboard"
      actions={
        <Button type="button" onClick={onNewSimulation}>
          New Simulation
        </Button>
      }
    />
  );
}
