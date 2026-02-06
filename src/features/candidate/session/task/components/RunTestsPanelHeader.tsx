'use client';

import Button from '@/shared/ui/Button';

type HeaderProps = {
  onClick: () => void;
  disabled: boolean;
  label: string;
};

export function RunTestsPanelHeader({ onClick, disabled, label }: HeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">
          Run tests (Actions)
        </div>
        <div className="text-xs text-gray-600">
          Prevent duplicate runs; polls until complete.
        </div>
      </div>
      <Button onClick={onClick} disabled={disabled}>
        {label}
      </Button>
    </div>
  );
}
