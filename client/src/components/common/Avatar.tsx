import { cn, getInitials } from '../../lib/format';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  speaking?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl'
};

export function Avatar({ name, src, size = 'md', online, speaking, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover ring-1 ring-white/15', sizeClasses[size])}
        />
      ) : (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-600/80 font-bold text-white ring-1 ring-white/15',
            sizeClasses[size]
          )}
        >
          {getInitials(name || '?')}
        </span>
      )}
      {speaking && (
        <span className="pointer-events-none absolute inset-0 animate-pulseRing rounded-full ring-2 ring-emerald-400" />
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface',
            online ? 'bg-emerald-400' : 'bg-slate-600'
          )}
        />
      )}
    </span>
  );
}
