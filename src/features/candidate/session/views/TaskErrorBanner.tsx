type Props = {
  message: string | null;
  onRetry: () => void;
};

export function TaskErrorBanner({ message, onRetry }: Props) {
  if (!message) return null;
  return (
    <div className="border rounded-md p-3 bg-red-50 text-sm text-red-800">
      {message}{' '}
      <button className="underline ml-2" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
