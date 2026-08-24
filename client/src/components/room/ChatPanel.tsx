import { useEffect, useRef, useState, type FormEvent } from 'react';
import { cn, formatTime } from '../../lib/format';
import { getSocket } from '../../lib/socket';
import { useAppSelector } from '../../store/hooks';

interface ChatPanelProps {
  roomId: string;
  canSend: boolean;
}

export function ChatPanel({ roomId, canSend }: ChatPanelProps) {
  const messages = useAppSelector((state) => state.rooms.current.messages);
  const me = useAppSelector((state) => state.auth.user);

  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !canSend) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('room:message', { roomId, message: text });
    setDraft('');
  };

  return (
    <div className="flex h-[420px] flex-col rounded-2xl border border-white/10 bg-surface-raised shadow-card">
      <div className="border-b border-white/5 px-5 py-3.5">
        <h2 className="font-bold text-white">Room Chat</h2>
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            No messages yet. Say hello 👋
          </p>
        )}

        {messages.map((message) =>
          message.kind === 'system' ? (
            <p key={message.id} className="text-center text-xs italic text-slate-500">
              — {message.message} —
            </p>
          ) : (
            <div
              key={message.id}
              className={cn('flex', message.from?.userId === me?._id ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                  message.from?.userId === me?._id
                    ? 'rounded-br-md bg-gradient-to-r from-indigo-500 to-violet-600 text-white'
                    : 'rounded-bl-md border border-white/10 bg-white/5 text-slate-200'
                )}
              >
                {message.from?.userId !== me?._id && (
                  <p className="mb-0.5 text-xs font-bold text-indigo-300">{message.from?.name}</p>
                )}
                <p className="break-words">{message.message}</p>
                <p
                  className={cn(
                    'mt-1 text-right text-[10px]',
                    message.from?.userId === me?._id ? 'text-indigo-200/70' : 'text-slate-500'
                  )}
                >
                  {formatTime(message.at)}
                </p>
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-white/5 p-4">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={1000}
          placeholder={canSend ? 'Type a message…' : 'Connecting to room…'}
          disabled={!canSend}
          className="flex-1 rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!canSend || draft.trim().length === 0}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 font-semibold text-white transition hover:from-indigo-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
