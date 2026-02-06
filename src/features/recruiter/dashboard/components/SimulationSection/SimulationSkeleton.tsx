import { TableSkeleton } from '@/shared/ui/TableSkeleton';

export function SimulationSkeleton() {
  return <TableSkeleton columns={4} rows={3} className="bg-white" />;
}
