import { useEffect } from 'react';
import { cn } from '../../lib/format';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { dismissToast, type ToastType } from '../../store/uiSlice';

const toneClasses: Record<ToastType, string> = {
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  error: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
  info: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200'
};

function ToastItem({ id, type, message }: { id: string; type: ToastType; message: string }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = window.setTimeout(() => dispatch(dismissToast(id)), 3500);
    return () => window.clearTimeout(timer);
  }, [dispatch, id]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-80 max-w-full animate-slideUp items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-card backdrop-blur',
        toneClasses[type]
      )}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={() => dispatch(dismissToast(id))}
        className="opacity-60 transition hover:opacity-100"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useAppSelector((state) => state.ui.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}
