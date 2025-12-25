import { InputHTMLAttributes, forwardRef } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { className = '', ...rest } = props;
  const baseClasses =
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const mergedClassName = `${baseClasses} ${className}`.trim();

  return <input ref={ref} className={mergedClassName} {...rest} />;
});

Input.displayName = 'Input';

export default Input;
