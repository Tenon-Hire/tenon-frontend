type Props = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
};

export function InviteInputField({
  id,
  label,
  value,
  placeholder,
  disabled,
  autoFocus,
  onChange,
}: Props) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
      {label}
      <input
        id={id}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </label>
  );
}
