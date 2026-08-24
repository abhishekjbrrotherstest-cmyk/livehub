import { cn } from '../../lib/format';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-indigo-300',
        className ?? 'h-5 w-5'
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
