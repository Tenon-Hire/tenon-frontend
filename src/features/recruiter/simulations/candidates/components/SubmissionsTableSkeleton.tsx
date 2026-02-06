'use client';
import { TableSkeleton } from '@/shared/ui/TableSkeleton';

export function SubmissionsTableSkeleton() {
  return <TableSkeleton columns={5} rows={4} className="bg-white" />;
}
