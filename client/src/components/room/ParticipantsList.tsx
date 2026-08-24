import { useAppSelector } from '../../store/hooks';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';

function hostIdOf(host: unknown): string | null {
  if (typeof host === 'string') return host;
  if (host && typeof host === 'object' && '_id' in host) return String((host as { _id: string })._id);
  return null;
}

export function ParticipantsList() {
  const participants = useAppSelector((state) => state.rooms.current.participants);
  const room = useAppSelector((state) => state.rooms.current.room);
  const me = useAppSelector((state) => state.auth.user);

  if (!room) return null;

  const hostId = hostIdOf(room.host);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-raised shadow-card">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
        <h2 className="font-bold text-white">Members</h2>
        <Badge tone="indigo">{participants.length}</Badge>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin p-2">
        {participants.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-slate-500">No members yet.</p>
        )}

        {participants.map((participant) => {
          const isHost = participant.userId === hostId;
          const isMe = participant.userId === me?._id;
          return (
            <div
              key={participant.userId}
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/5"
            >
              <Avatar
                name={participant.name}
                src={participant.profileImage ?? undefined}
                size="sm"
                online={participant.isOnline}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                {participant.name}
              </span>
              {isHost && <Badge tone="indigo">Host</Badge>}
              {isMe && !isHost && <Badge tone="slate">You</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
