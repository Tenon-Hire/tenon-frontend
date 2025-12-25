import { cn } from '@/components/ui/cn';

const baseButton =
  'inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

export const primaryCtaClass = cn(
  baseButton,
  'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600',
);

export const secondaryCtaClass = cn(
  baseButton,
  'border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400',
);
