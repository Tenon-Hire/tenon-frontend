type Props = { length: number; savedAt: number | null };

export function TaskTextFooter({ length, savedAt }: Props) {
  return (
    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
      <span>{length.toLocaleString()} characters</span>
      {savedAt ? <span>Draft saved</span> : null}
    </div>
  );
}
