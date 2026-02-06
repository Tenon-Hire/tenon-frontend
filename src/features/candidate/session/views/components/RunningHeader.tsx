type Props = {
  title: string;
  role: string;
  taskLoading: boolean;
};

export function RunningHeader({ title, role, taskLoading }: Props) {
  return (
    <div className="flex items-baseline justify-between">
      <div>
        <div className="text-xl font-bold">{title}</div>
        <div className="text-sm text-gray-600">Role: {role}</div>
      </div>
      {taskLoading ? (
        <div className="text-sm text-gray-500">Refreshing…</div>
      ) : null}
    </div>
  );
}
