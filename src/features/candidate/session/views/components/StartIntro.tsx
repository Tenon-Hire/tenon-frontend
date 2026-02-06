type Props = { title: string; role: string };

export function StartIntro({ title, role }: Props) {
  return (
    <div className="space-y-1">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="text-sm text-gray-600">Role: {role}</div>
      <div className="text-xs text-gray-500">
        5-day simulation over 5 consecutive days. Each day runs 9:00 AM–5:00 PM
        local time. Complete each day in order.
      </div>
    </div>
  );
}
