export default function Loading() {
  return (
    <div className="py-8">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}
