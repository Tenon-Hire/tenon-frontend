'use client';

export function Pre({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 rounded border border-gray-200 bg-white/60 p-2 text-[11px] text-gray-700">
      <div className="font-semibold text-gray-800">{label}</div>
      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-[11px]">
        {value}
      </pre>
    </div>
  );
}
