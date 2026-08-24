import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/format';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-glow hover:from-indigo-400 hover:to-violet-500',
  secondary: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
  danger: 'bg-rose-600/90 text-white hover:bg-rose-500',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white'
};

export function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
