type StatusPillProps = {
  label: string;
  tone?: 'info' | 'success' | 'warning' | 'muted';
};

const toneClasses: Record<NonNullable<StatusPillProps['tone']>, string> = {
  info: 'bg-blue-50 text-blue-800',
  success: 'bg-green-50 text-green-800',
  warning: 'bg-yellow-50 text-yellow-800',
  muted: 'bg-gray-100 text-gray-800',
};

export function StatusPill({ label, tone = 'muted' }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
