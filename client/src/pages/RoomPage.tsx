import { useCallback, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChatPanel } from '../components/room/ChatPanel';
import { ParticipantsList } from '../components/room/ParticipantsList';
import { VoicePanel } from '../components/room/VoicePanel';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { getSocket } from '../lib/socket';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMessages,
  fetchRoom,
  joinRoomRest,
  resetCurrent,
  setCurrentJoined
} from '../store/roomsSlice';
import { pushToast } from '../store/uiSlice';

function hostIdOf(host: unknown): string | null {
  if (typeof host === 'string') return host;
  if (host && typeof host === 'object' && '_id' in host) return String((host as { _id: string })._id);
  return null;
}

export function RoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const room = useAppSelector((state) => state.rooms.current.room);
  const loading = useAppSelector((state) => state.rooms.current.loading);
  const error = useAppSelector((state) => state.rooms.current.error);
  const joined = useAppSelector((state) => state.rooms.current.joined);
  const me = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (!roomId) return;
    dispatch(resetCurrent());
    void dispatch(fetchRoom(roomId))
      .unwrap()
      .then(() => {
        void dispatch(fetchMessages(roomId));
        return dispatch(joinRoomRest(roomId));
      })
      .then(() => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('room:join', { roomId }, (ack) => {
          if (ack.success) {
            dispatch(setCurrentJoined(true));
          } else {
            dispatch(pushToast({ type: 'error', message: ack.message }));
          }
        });
      })
      .catch(() => undefined);
  }, [dispatch, roomId]);

  const handleLeave = useCallback(() => {
    const socket = getSocket();
    if (socket && room?.status === 'active') {
      socket.emit('room:leave', { roomId }, (ack) => {
        dispatch(pushToast({ type: ack.success ? 'info' : 'error', message: ack.message }));
      });
    }
    dispatch(resetCurrent());
    navigate('/rooms');
  }, [dispatch, navigate, roomId, room?.status]);

  if (loading && !room) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-slate-300">{error ?? 'Room not found'}</p>
        <Link to="/rooms">
          <Button variant="secondary">← Back to rooms</Button>
        </Link>
      </div>
    );
  }

  const ended = room.status === 'ended';
  const isHost = hostIdOf(room.host) === me?._id;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/rooms"
            onClick={(event) => {
              event.preventDefault();
              handleLeave();
            }}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-300"
          >
            ← Back to rooms
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-xl font-extrabold text-white">{room.name}</h1>
            {ended ? (
              <Badge tone="slate">Ended</Badge>
            ) : (
              <>
                <Badge tone="green">Live</Badge>
                <Badge tone="indigo">👥 {joined ? 'connected' : 'connecting…'}</Badge>
              </>
            )}
          </div>
        </div>

        <Button variant={ended ? 'secondary' : 'danger'} onClick={handleLeave}>
          Leave room
        </Button>
      </div>

      {ended && (
        <div className="mb-5 animate-slideUp rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm font-medium text-amber-200">
          This room has ended. Redirecting you back…
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <VoicePanel room={room} isHost={isHost} ended={ended} />

        <div className="space-y-6">
          <ParticipantsList />
          <ChatPanel roomId={roomId} canSend={joined && !ended} />
        </div>
      </div>

      {ended && (
        <RedirectAfterEnd onDone={() => navigate('/rooms')} />
      )}
    </div>
  );
}

function RedirectAfterEnd({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2500);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return null;
}
