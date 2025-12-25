type TaskErrorBannerProps = {
  message: string | null;
};

export function TaskErrorBanner({ message }: TaskErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
  );
}
