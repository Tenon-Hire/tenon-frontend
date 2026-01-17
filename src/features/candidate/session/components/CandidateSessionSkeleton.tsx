import { Skeleton } from '@/components/ui/Skeleton';

type CandidateSessionSkeletonProps = {
  message?: string;
};

export function CandidateSessionSkeleton({
  message = 'Preparing your simulation…',
}: CandidateSessionSkeletonProps) {
  return (
    <div className="p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-3 w-40 bg-gray-100" />
            <Skeleton className="h-3 w-64 bg-gray-100" />
          </div>
          <div className="text-sm text-gray-500">{message}</div>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 bg-gray-100" />
              <Skeleton className="h-3 w-60 bg-gray-100" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 rounded-md border border-gray-200 bg-gray-50 p-3"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-4 w-28" />
                <Skeleton className="mt-2 h-3 w-32 bg-gray-100" />
                <Skeleton className="mt-3 h-3 w-24 bg-gray-100" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-48 bg-gray-100" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full bg-gray-100" />
                <Skeleton className="h-3 w-5/6 bg-gray-100" />
                <Skeleton className="h-3 w-4/6 bg-gray-100" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-64 bg-gray-100" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-3 w-full bg-gray-100" />
            <Skeleton className="h-3 w-full bg-gray-100" />
            <Skeleton className="h-3 w-5/6 bg-gray-100" />
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24 bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
