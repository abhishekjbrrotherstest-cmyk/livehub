import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '🎙️', title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-3xl">
        {icon}
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-slate-400">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
