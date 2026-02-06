import { cn } from './classnames';
import { Skeleton } from './Skeleton';

type TableSkeletonProps = {
  columns?: number;
  rows?: number;
  className?: string;
};

export function TableSkeleton({
  columns = 4,
  rows = 3,
  className,
}: TableSkeletonProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded border border-gray-200',
        className,
      )}
    >
      <div
        className="grid gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton key={`h-${idx}`} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`r-${rowIdx}`}
          className="grid items-center gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={`c-${rowIdx}-${colIdx}`} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
