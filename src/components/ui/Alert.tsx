import { ReactNode } from 'react';
import { cn } from './cn';
import { Tone } from './types';

type AlertProps = {
  tone?: Tone;
  title?: string;
  body?: string;
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
};

const toneStyles: Record<Tone, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export default function Alert({
  tone = 'info',
  title,
  body,
  children,
  className,
  icon,
}: AlertProps) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded border p-3 leading-relaxed',
        toneStyles[tone],
        className,
      )}
      role="alert"
    >
      {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
      <div className="space-y-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        {body ? <p className="text-sm">{body}</p> : null}
        {children}
      </div>
    </div>
  );
}
