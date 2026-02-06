'use client';

export function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded border border-gray-200 bg-white p-2 text-center">
      <div className="text-[11px] uppercase text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value ?? '—'}</div>
    </div>
  );
}
