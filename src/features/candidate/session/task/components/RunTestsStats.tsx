'use client';

type Props = {
  passed: number | null;
  failed: number | null;
  total: number | null;
};

export function RunTestsStats({ passed, failed, total }: Props) {
  const hasCounts = passed !== null || failed !== null || total !== null;
  if (!hasCounts) return null;

  const items = [
    { label: 'Passed', value: passed },
    { label: 'Failed', value: failed },
    {
      label: 'Total',
      value:
        total ?? (passed !== null && failed !== null ? passed + failed : null),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded border border-gray-200 bg-gray-50 p-2 text-gray-700"
        >
          <div className="text-[11px] uppercase text-gray-500">
            {item.label}
          </div>
          <div className="text-sm font-semibold">{item.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}
