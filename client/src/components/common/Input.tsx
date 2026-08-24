import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/format';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...rest },
  ref
) {
  const inputId = id ?? rest.name ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-white/10 bg-surface-raised px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
          error && 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/30',
          className
        )}
        {...rest}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
});
