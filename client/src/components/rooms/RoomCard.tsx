import { Link } from 'react-router-dom';
import type { RoomSummary } from '../../types';
import { timeAgo } from '../../lib/format';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';

function hostName(room: RoomSummary): string {
  if (typeof room.host === 'string') return 'Host';
  return room.host?.name ?? 'Host';
}

function hostImage(room: RoomSummary): string | undefined {
  if (typeof room.host === 'string') return undefined;
  return room.host?.profileImage ?? undefined;
}

interface RoomCardProps {
  room: RoomSummary;
  liveCount?: number;
}

export function RoomCard({ room, liveCount }: RoomCardProps) {
  const count = liveCount ?? room.liveParticipantCount ?? room.participantCount ?? 0;
  const ended = room.status === 'ended';

  return (
    <Link
      to={`/rooms/${room._id}`}
      className={`group relative block overflow-hidden rounded-2xl border border-white/10 bg-surface-raised p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-glow ${
        ended ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="truncate text-base font-bold text-white transition group-hover:text-indigo-200">
          {room.name}
        </h3>
        {!ended && (
          <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2.5">
        <Avatar name={hostName(room)} src={hostImage(room)} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-200">{hostName(room)}</p>
          <p className="text-[11px] text-slate-500">created {timeAgo(room.createdAt)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge tone={ended ? 'slate' : 'green'}>{ended ? 'Ended' : 'Live'}</Badge>
        <span className="text-xs font-medium text-slate-400">
          👥 {count} {count === 1 ? 'participant' : 'participants'}
        </span>
      </div>
    </Link>
  );
}
