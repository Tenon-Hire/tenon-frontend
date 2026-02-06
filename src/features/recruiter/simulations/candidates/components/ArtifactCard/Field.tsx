'use client';

type Props = {
  label: string;
  value: string | null;
  link?: string | null;
  linkLabel?: string | null;
};

export function Field({ label, value, link, linkLabel }: Props) {
  if (!value && !link) return null;
  const text = value ?? link ?? 'Not available';
  return (
    <div className="text-xs text-gray-700">
      <div className="font-semibold text-gray-800">{label}</div>
      {link ? (
        <a
          className="text-blue-600 hover:underline"
          href={link}
          target="_blank"
          rel="noreferrer"
        >
          {linkLabel ?? text}
        </a>
      ) : (
        <div className="text-gray-500">{text}</div>
      )}
    </div>
  );
}
