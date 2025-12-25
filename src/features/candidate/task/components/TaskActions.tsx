import Button from '@/components/common/Button';

type TaskActionsProps = {
  isTextTask: boolean;
  displayStatus: 'idle' | 'submitting' | 'submitted';
  onSaveDraft?: () => void;
  onSubmit: () => void;
};

export function TaskActions({
  isTextTask,
  displayStatus,
  onSaveDraft,
  onSubmit,
}: TaskActionsProps) {
  const submitLabel =
    displayStatus === 'submitting'
      ? 'Submitting…'
      : displayStatus === 'submitted'
        ? 'Submitted ✓'
        : 'Submit & Continue';

  const disabled = displayStatus !== 'idle';

  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      {isTextTask ? (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          Save draft
        </button>
      ) : (
        <div />
      )}

      <Button onClick={onSubmit} disabled={disabled}>
        {submitLabel}
      </Button>
    </div>
  );
}
