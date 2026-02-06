type Props = { message: string; onRetry: () => void };

export function SubmissionsErrorCard({ message, onRetry }: Props) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <div>{message}</div>
      <div className="mt-2">
        <button className="text-blue-600 underline" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}
