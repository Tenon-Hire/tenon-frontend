type Props = {
  message: string;
  onRetry?: () => void;
};

export function SimulationError({ message, onRetry }: Props) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-medium text-red-700">
        Couldn’t load simulations
      </p>
      <p className="text-sm text-red-700">{message}</p>
      {onRetry ? (
        <div className="mt-2">
          <button
            className="text-sm font-medium text-blue-700 underline"
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
