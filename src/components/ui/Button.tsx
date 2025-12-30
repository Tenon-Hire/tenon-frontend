import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
};

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-blue-600 text-white border-transparent hover:bg-blue-700 focus:ring-blue-500',
  secondary:
    'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
  ghost:
    'bg-transparent text-gray-700 border-transparent hover:bg-gray-50 focus:ring-blue-500',
};

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  iconPosition = 'left',
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-md border font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        'Loading…'
      ) : (
        <>
          {icon && iconPosition === 'left' ? (
            <span className="mr-2 inline-flex items-center">{icon}</span>
          ) : null}
          {children}
          {icon && iconPosition === 'right' ? (
            <span className="ml-2 inline-flex items-center">{icon}</span>
          ) : null}
        </>
      )}
    </button>
  );
}
