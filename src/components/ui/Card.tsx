import { ReactNode } from 'react';
import { cn } from './cn';

type CardProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function Card({
  title,
  subtitle,
  actions,
  children,
  className,
}: CardProps) {
  return (
    <section
      className={cn(
        'rounded border border-gray-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      {(title || actions) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title ? (
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="text-sm text-gray-600">{subtitle}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </header>
      )}

      <div className="text-sm text-gray-800">{children}</div>
    </section>
  );
}
