import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Link from 'next/link';

type DashboardHeaderProps = {
  onNewSimulation: () => void;
};

export function DashboardHeader({ onNewSimulation }: DashboardHeaderProps) {
  return (
    <PageHeader
      title="Dashboard"
      actions={
        <Link href="/dashboard/simulations/new" prefetch>
          <Button type="button" onClick={onNewSimulation}>
            New Simulation
          </Button>
        </Link>
      }
    />
  );
}
