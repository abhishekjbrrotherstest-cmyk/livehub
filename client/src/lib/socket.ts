import { io, type Socket } from 'socket.io-client';

export interface AckResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface PresenceEvent {
  userId: string;
  name: string;
  at: string;
}

export interface ParticipantEvent {
  roomId: string;
  user: { userId: string; name: string };
  source?: 'app' | 'livekit';
  at: string;
}

export interface CountEvent {
  roomId: string;
  participantCount: number;
  at: string;
}

export interface StatusEvent {
  roomId: string;
  status: 'active' | 'ended';
  at: string;
}

export interface MessageEvent {
  id?: string;
  roomId: string;
  from: { userId: string; name: string };
  message: string;
  at: string;
}

export interface ClientToServerEvents {
  'room:join': (payload: { roomId: string }, ack?: (res: AckResponse) => void) => void;
  'room:leave': (payload: { roomId: string }, ack?: (res: AckResponse) => void) => void;
  'room:message': (payload: { roomId: string; message: string }) => void;
  'presence:heartbeat': () => void;
}

export interface ServerToClientEvents {
  'presence:online': (payload: PresenceEvent) => void;
  'presence:offline': (payload: PresenceEvent) => void;
  'room:participant-joined': (payload: ParticipantEvent) => void;
  'room:participant-left': (payload: ParticipantEvent) => void;
  'room:participant-count': (payload: CountEvent) => void;
  'room:status-updated': (payload: StatusEvent) => void;
  'room:message': (payload: MessageEvent) => void;
}

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? window.location.origin).replace(/\/$/, '');

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function connectSocket(token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  disconnectSocket();
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000
  });
  return socket;
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
