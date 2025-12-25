type TaskTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  savedAt: number | null;
};

export function TaskTextInput({
  value,
  onChange,
  disabled,
  savedAt,
}: TaskTextInputProps) {
  return (
    <>
      <textarea
        className="w-full min-h-[260px] rounded-md border p-3 text-sm leading-6"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your response here…"
        disabled={disabled}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{value.length.toLocaleString()} characters</span>
        {savedAt ? <span>Draft saved</span> : null}
      </div>
    </>
  );
}
