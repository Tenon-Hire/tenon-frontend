import type { ReactNode } from 'react';
import { cn } from './cn';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
