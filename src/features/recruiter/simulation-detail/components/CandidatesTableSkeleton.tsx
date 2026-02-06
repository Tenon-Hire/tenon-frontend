'use client';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export function CandidatesTableSkeleton() {
  return <TableSkeleton columns={9} rows={3} className="bg-white" />;
}
