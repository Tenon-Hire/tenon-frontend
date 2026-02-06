import Button from '@/shared/ui/Button';

type Props = { url: string; onClose: () => void };

export function ManualInviteLink({ url, onClose }: Props) {
  return (
    <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
      <div className="text-xs text-gray-600">Copy the link manually:</div>
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Manual invite link"
        />
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
