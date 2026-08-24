import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, type RemoteParticipant, type RemoteTrack } from 'livekit-client';
import { api } from '../../lib/api';
import { cn } from '../../lib/format';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { pushToast } from '../../store/uiSlice';
import type { LiveKitTokenData, RoomSummary } from '../../types';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';

interface VoicePanelProps {
  room: RoomSummary;
  isHost: boolean;
  ended: boolean;
}

type VoiceState = 'idle' | 'connecting' | 'connected' | 'error';

function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-9 w-9">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      {!off && <path d="M19 10v2a7 7 0 0 1-14 0v-2" />}
      <line x1="12" y1="19" x2="12" y2="22" />
      {off && (
        <>
          <line x1="19" y1="10" x2="19" y2="12" className="opacity-50" />
          <line x1="4" y1="4" x2="20" y2="20" />
        </>
      )}
    </svg>
  );
}

export function VoicePanel({ room, isHost, ended }: VoicePanelProps) {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.auth.user);

  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [muted, setMuted] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [speakingIds, setSpeakingIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const syncParticipants = useCallback((liveRoom: Room) => {
    setRemoteParticipants(Array.from(liveRoom.remoteParticipants.values()));
  }, []);

  const joinVoice = async () => {
    if (!me || voiceState === 'connecting' || voiceState === 'connected' || ended) return;

    setVoiceState('connecting');
    setErrorMsg(null);

    try {
      const res = await api<LiveKitTokenData>('/livekit/token', {
        method: 'POST',
        body: { roomName: room._id, role: isHost ? 'host' : 'participant' }
      });

      const liveRoom = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = liveRoom;

      liveRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio && audioContainerRef.current) {
          const element = track.attach();
          element.autoplay = true;
          element.style.display = 'none';
          audioContainerRef.current.appendChild(element);
        }
      });
      liveRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((element) => element.remove());
      });
      liveRoom.on(RoomEvent.ParticipantConnected, () => syncParticipants(liveRoom));
      liveRoom.on(RoomEvent.ParticipantDisconnected, () => syncParticipants(liveRoom));
      liveRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setSpeakingIds(speakers.map((speaker) => speaker.identity));
      });
      liveRoom.on(RoomEvent.Disconnected, () => {
        setVoiceState('idle');
        setMuted(false);
        setRemoteParticipants([]);
        setSpeakingIds([]);
      });

      await liveRoom.connect(res.data.serverUrl, res.data.token);
      await liveRoom.localParticipant.setMicrophoneEnabled(true);
      setMuted(false);
      syncParticipants(liveRoom);
      setVoiceState('connected');
      dispatch(pushToast({ type: 'success', message: 'Connected to voice' }));
    } catch (err) {
      await roomRef.current?.disconnect().catch(() => undefined);
      roomRef.current = null;
      setVoiceState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Could not connect to LiveKit server');
    }
  };

  const leaveVoice = async () => {
    await roomRef.current?.disconnect().catch(() => undefined);
    roomRef.current = null;
  };

  const toggleMute = async () => {
    const liveRoom = roomRef.current;
    if (!liveRoom || voiceState !== 'connected') return;
    const nextMuted = !muted;
    try {
      await liveRoom.localParticipant.setMicrophoneEnabled(!nextMuted);
      setMuted(nextMuted);
    } catch {
      dispatch(pushToast({ type: 'error', message: 'Could not change microphone state' }));
    }
  };

  useEffect(() => {
    const ref = roomRef;
    return () => {
      void ref.current?.disconnect().catch(() => undefined);
      ref.current = null;
    };
  }, []);

  useEffect(() => {
    if (ended && roomRef.current) {
      void roomRef.current.disconnect().catch(() => undefined);
      roomRef.current = null;
    }
  }, [ended]);

  const connected = voiceState === 'connected';

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-raised p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Voice Room</h2>
        {connected ? (
          <Badge tone="green">🟢 On air · {remoteParticipants.length + 1}</Badge>
        ) : voiceState === 'connecting' ? (
          <Badge tone="indigo">Connecting…</Badge>
        ) : voiceState === 'error' ? (
          <Badge tone="rose">Connection failed</Badge>
        ) : (
          <Badge tone="slate">{ended ? 'Room ended' : 'Not connected'}</Badge>
        )}
      </div>

      <div ref={audioContainerRef} className="hidden" />

      <div className="flex flex-col items-center gap-6 py-8">
        {!connected && (
          <button
            onClick={joinVoice}
            disabled={voiceState === 'connecting' || ended}
            aria-label="Join voice"
            className={cn(
              'group relative flex h-32 w-32 items-center justify-center rounded-full transition-transform duration-200',
              'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow',
              'hover:scale-105 active:scale-95',
              (voiceState === 'connecting' || ended) && 'cursor-not-allowed opacity-60 hover:scale-100'
            )}
          >
            {voiceState === 'connecting' && (
              <span className="absolute inset-0 animate-pulseRing rounded-full bg-indigo-400/40" />
            )}
            <span className="flex items-center justify-center text-white">
              {voiceState === 'connecting' ? <Spinner className="h-9 w-9" /> : <MicIcon />}
            </span>
          </button>
        )}

        {connected && (
          <>
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow">
              <span className="absolute inset-0 rounded-full ring-2 ring-emerald-400/60" />
              <span className="text-white">{muted ? <MicIcon off /> : <MicIcon />}</span>
            </div>

            <div className="flex gap-3">
              <Button variant={muted ? 'danger' : 'secondary'} onClick={toggleMute}>
                {muted ? '🔇 Unmute' : '🎙️ Mute'}
              </Button>
              <Button variant="secondary" onClick={leaveVoice}>
                Leave voice
              </Button>
            </div>
            <p className="-mt-2 text-xs text-slate-500">
              {muted ? 'Your microphone is muted' : 'Your microphone is live'}
            </p>
          </>
        )}

        <p className="text-center text-sm font-medium text-slate-400">
          {ended
            ? 'This room has ended.'
            : connected
              ? 'Speak up — everyone hears you in real time.'
              : voiceState === 'error'
                ? errorMsg
                : 'Tap the mic to start talking.'}
        </p>

        {voiceState === 'error' && !ended && (
          <Button variant="secondary" onClick={joinVoice}>
            Try again
          </Button>
        )}
      </div>

      {(remoteParticipants.length > 0 || connected) && me && (
        <div className="border-t border-white/5 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">On air now</p>
          <div className="flex flex-wrap gap-3">
            <Avatar name={me.name} src={me.profileImage ?? undefined} size="lg" speaking={speakingIds.includes(me._id)} online />
            {remoteParticipants.map((participant) => (
              <Avatar
                key={participant.identity}
                name={participant.name || participant.identity}
                size="lg"
                speaking={speakingIds.includes(participant.identity)}
                online
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
