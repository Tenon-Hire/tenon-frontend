'use client';
import { TableSkeleton } from '@/shared/ui/TableSkeleton';

export function CandidatesTableSkeleton() {
  return <TableSkeleton columns={9} rows={3} className="bg-white" />;
}
