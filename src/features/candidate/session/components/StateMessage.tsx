type StateMessageProps = {
  title: string;
  description?: string | null;
  action?: React.ReactNode;
};

export function StateMessage({
  title,
  description,
  action,
}: StateMessageProps) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-lg font-semibold">{title}</div>
      {description ? (
        <div className="text-sm text-gray-600 mt-2">{description}</div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
