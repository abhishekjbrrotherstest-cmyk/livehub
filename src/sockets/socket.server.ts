import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis, redisSub } from '../config/redis';
import { corsOrigin } from '../utils/cors';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { User } from '../models/User';
import { Participation } from '../models/Participation';
import { Room } from '../models/Room';
import { presence } from '../services/presence.service';
import * as messageService from '../services/message.service';
import * as roomService from '../services/room.service';
import { bus } from '../events/eventBus';

export interface ClientToServerEvents {
  'room:join': (payload: { roomId: string }, ack?: (response: AckResponse) => void) => void;
  'room:leave': (payload: { roomId: string }, ack?: (response: AckResponse) => void) => void;
  'room:message': (payload: { roomId: string; message: string }) => void;
  'presence:heartbeat': () => void;
}

export interface ServerToClientEvents {
  'presence:online': (payload: PresencePayload) => void;
  'presence:offline': (payload: PresencePayload) => void;
  'room:participant-joined': (payload: ParticipantEventPayload) => void;
  'room:participant-left': (payload: ParticipantEventPayload) => void;
  'room:participant-count': (payload: { roomId: string; participantCount: number; at: string }) => void;
  'room:status-updated': (payload: { roomId: string; status: string; at: string }) => void;
  'room:message': (payload: {
    id: string;
    roomId: string;
    from: { userId: string; name: string };
    message: string;
    at: string;
  }) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  userId: string;
  name: string;
  email: string;
  joinedRoomIds: string[];
}

export interface AckResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

interface PresencePayload {
  userId: string;
  name: string;
  at: string;
}

interface ParticipantEventPayload {
  roomId: string;
  user: { userId: string; name: string };
  participantCount?: number;
  source?: 'app' | 'livekit';
  at: string;
}

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const ROOM_CHANNEL_PREFIX = 'room:';
const USER_CHANNEL_PREFIX = 'user:';
const HEARTBEAT_INTERVAL_MS = 30_000;
const STALE_REAP_INTERVAL_MS = 60_000;
const MAX_MESSAGE_LENGTH = 1000;

function authenticateHandshake(socket: AppSocket, next: (err?: Error) => void): void {
  const headerAuth = socket.handshake.headers.authorization;
  const token =
    (typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : undefined) ??
    (headerAuth?.startsWith('Bearer ') ? headerAuth.slice(7).trim() : undefined);

  if (!token) return next(new Error('Authentication token is missing'));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new Error('Invalid or expired token'));
  }

  socket.data.userId = payload.id;
  socket.data.email = payload.email;
  socket.data.joinedRoomIds = [];

  void (async () => {
    try {
      const user = await User.findById(payload.id).select('name').lean<{ name?: string } | null>();
      socket.data.name = user?.name ?? 'Unknown';
      next();
    } catch {
      next(new Error('Could not load user profile'));
    }
  })();
}

async function rejoinOpenRooms(socket: AppSocket): Promise<void> {
  const openParticipations = await Participation.find({
    user: socket.data.userId,
    leftAt: null
  })
    .select('room')
    .lean<{ room: { toString(): string } }[]>();

  if (openParticipations.length === 0) return;

  const roomIds = openParticipations.map((p) => p.room.toString());
  const activeRooms = await Room.find({ _id: { $in: roomIds }, status: 'active' }).select('_id').lean();

  for (const room of activeRooms) {
    const roomId = room._id.toString();
    const channel = `${ROOM_CHANNEL_PREFIX}${roomId}`;
    await socket.join(channel);
    if (!socket.data.joinedRoomIds.includes(roomId)) socket.data.joinedRoomIds.push(roomId);
  }
}

async function handleDisconnect(io: AppServer, socket: AppSocket): Promise<void> {
  const { userId, name } = socket.data;
  try {
    const isLastConnection = await presence.markOffline(userId);
    if (isLastConnection) {
      await User.updateOne({ _id: userId }, { isOnline: false, lastSeenAt: new Date() });
      io.emit('presence:offline', { userId, name, at: new Date().toISOString() });
    }
  } catch (err) {
    logger.error(`Presence cleanup failed for ${userId}: ${err instanceof Error ? err.message : err}`);
  }
}

async function handleRoomJoin(
  _io: AppServer,
  socket: AppSocket,
  payload: { roomId: string },
  ack?: (response: AckResponse) => void
): Promise<void> {
  const fail = (message: string) => ack?.({ success: false, message });

  if (!payload || typeof payload.roomId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(payload.roomId)) {
    return fail('Valid roomId is required');
  }

  try {
    const result = await roomService.joinRoom(socket.data.userId, payload.roomId);
    const channel = `${ROOM_CHANNEL_PREFIX}${result.roomId}`;
    await socket.join(channel);
    if (!socket.data.joinedRoomIds.includes(result.roomId)) {
      socket.data.joinedRoomIds.push(result.roomId);
    }
    ack?.({ success: true, message: 'Joined room', data: result });
  } catch (err) {
    const apiErr = err as { statusCode?: number; message?: string };
    if (apiErr && typeof apiErr === 'object' && typeof apiErr.statusCode === 'number') {
      return fail(apiErr.message ?? 'Could not join room');
    }
    logger.error(`room:join failed: ${err instanceof Error ? err.message : err}`);
    fail('Could not join room');
  }
}

async function handleRoomLeave(
  socket: AppSocket,
  payload: { roomId: string },
  ack?: (response: AckResponse) => void
): Promise<void> {
  const fail = (message: string) => ack?.({ success: false, message });

  if (!payload || typeof payload.roomId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(payload.roomId)) {
    return fail('Valid roomId is required');
  }

  try {
    const result = await roomService.leaveRoom(socket.data.userId, payload.roomId);
    const channel = `${ROOM_CHANNEL_PREFIX}${result.roomId}`;
    await socket.leave(channel);
    socket.data.joinedRoomIds = socket.data.joinedRoomIds.filter((id) => id !== result.roomId);
    ack?.({ success: true, message: 'Left room', data: result });
  } catch (err) {
    const apiErr = err as { statusCode?: number; message?: string };
    if (apiErr && typeof apiErr === 'object' && typeof apiErr.statusCode === 'number') {
      return fail(apiErr.message ?? 'Could not leave room');
    }
    logger.error(`room:leave failed: ${err instanceof Error ? err.message : err}`);
    fail('Could not leave room');
  }
}

async function handleRoomMessage(
  io: AppServer,
  socket: AppSocket,
  payload: { roomId: string; message: string }
): Promise<void> {
  if (!payload || typeof payload.roomId !== 'string') return;
  if (typeof payload.message !== 'string') return;
  const text = payload.message.trim();
  if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) return;

  const channel = `${ROOM_CHANNEL_PREFIX}${payload.roomId}`;
  if (!socket.rooms.has(channel)) return;

  try {
    const saved = await messageService.createMessage({
      roomId: payload.roomId,
      senderId: socket.data.userId,
      senderName: socket.data.name,
      text
    });

    io.to(channel).emit('room:message', {
      id: saved.id,
      roomId: payload.roomId,
      from: { userId: socket.data.userId, name: socket.data.name },
      message: saved.text,
      at: saved.at
    });
  } catch (err) {
    logger.error(`room:message persistence failed: ${err instanceof Error ? err.message : err}`);
  }
}

function subscribeToDomainEvents(io: AppServer): void {
  bus.subscribe('room:participant-joined', (payload) => {
    io.to(`${ROOM_CHANNEL_PREFIX}${payload.roomId}`).emit('room:participant-joined', {
      ...payload,
      source: 'app'
    });
  });

  bus.subscribe('room:participant-left', (payload) => {
    io.to(`${ROOM_CHANNEL_PREFIX}${payload.roomId}`).emit('room:participant-left', {
      ...payload,
      source: 'app'
    });
  });

  bus.subscribe('room:participant-count-changed', (payload) => {
    io.to(`${ROOM_CHANNEL_PREFIX}${payload.roomId}`).emit('room:participant-count', payload);
  });

  bus.subscribe('room:status-changed', (payload) => {
    io.to(`${ROOM_CHANNEL_PREFIX}${payload.roomId}`).emit('room:status-updated', payload);
  });

  bus.subscribe('rtc:participant-joined', (payload) => {
    io.to(`${ROOM_CHANNEL_PREFIX}${payload.roomId}`).emit('room:participant-joined', {
      roomId: payload.roomId,
      user: { userId: payload.identity, name: payload.identity },
      source: 'livekit',
      at: payload.at
    });
  });

  bus.subscribe('rtc:participant-left', (payload) => {
    io.to(`${ROOM_CHANNEL_PREFIX}${payload.roomId}`).emit('room:participant-left', {
      roomId: payload.roomId,
      user: { userId: payload.identity, name: payload.identity },
      source: 'livekit',
      at: payload.at
    });
  });
}

async function reapStalePresence(io: AppServer): Promise<void> {
  const staleUserIds = await presence.reapStale();
  if (staleUserIds.length === 0) return;

  for (const userId of staleUserIds) {
    const connectionCount = await presence.getConnectionCount(userId);
    if (connectionCount > 0) continue;

    const user = await User.findById(userId).select('name').lean<{ name?: string } | null>();
    await User.updateOne({ _id: userId }, { isOnline: false, lastSeenAt: new Date() });
    io.emit('presence:offline', {
      userId,
      name: user?.name ?? 'Unknown',
      at: new Date().toISOString()
    });
  }
}

export function initSocketServer(httpServer: HttpServer): AppServer {
  const io: AppServer = new Server(httpServer, {
    cors: { origin: corsOrigin(), methods: ['GET', 'POST'], credentials: true },
    pingInterval: 25_000,
    pingTimeout: 20_000
  });

  io.adapter(createAdapter(redis, redisSub));

  io.use(authenticateHandshake);

  io.on('connection', (socket) => {
    void (async () => {
      const { userId, name } = socket.data;
      const at = new Date().toISOString();

      await presence.markOnline(userId);
      await User.updateOne({ _id: userId }, { isOnline: true, lastSeenAt: new Date() });
      io.emit('presence:online', { userId, name, at });

      socket.join(`${USER_CHANNEL_PREFIX}${userId}`);
      try {
        await rejoinOpenRooms(socket);
      } catch (err) {
        logger.warn(`Could not restore rooms for ${userId}: ${err instanceof Error ? err.message : err}`);
      }

      const heartbeat = setInterval(() => {
        void presence.heartbeat(userId).catch(() => undefined);
      }, HEARTBEAT_INTERVAL_MS);

      socket.on('room:join', (payload, ack) => {
        void handleRoomJoin(io, socket, payload, ack);
      });

      socket.on('room:leave', (payload, ack) => {
        void handleRoomLeave(socket, payload, ack);
      });

      socket.on('room:message', (payload) => {
        void handleRoomMessage(io, socket, payload);
      });

      socket.on('presence:heartbeat', () => {
        void presence.heartbeat(userId).catch(() => undefined);
      });

      socket.on('disconnect', () => {
        clearInterval(heartbeat);
        void handleDisconnect(io, socket);
      });
    })();
  });

  subscribeToDomainEvents(io);

  const reaper = setInterval(() => {
    void reapStalePresence(io).catch((err) =>
      logger.warn(`Stale presence reap failed: ${err instanceof Error ? err.message : err}`)
    );
  }, STALE_REAP_INTERVAL_MS);
  reaper.unref();

  logger.info('Socket.IO server initialised with Redis adapter');
  return io;
}
