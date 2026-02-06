'use client';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export function SubmissionsTableSkeleton() {
  return <TableSkeleton columns={5} rows={4} className="bg-white" />;
}
