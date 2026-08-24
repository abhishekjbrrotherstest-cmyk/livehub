import type { ReactNode } from 'react';
import { cn } from '../../lib/format';

type Tone = 'green' | 'indigo' | 'slate' | 'rose';

const toneClasses: Record<Tone, string> = {
  green: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  indigo: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300',
  slate: 'border-white/10 bg-white/5 text-slate-300',
  rose: 'border-rose-500/30 bg-rose-500/15 text-rose-300'
};

export function Badge({
  children,
  tone = 'slate',
  className
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
