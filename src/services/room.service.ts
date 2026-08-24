import type { FilterQuery, Types } from 'mongoose';
import { Room } from '../models/Room';
import { Participation } from '../models/Participation';
import { User } from '../models/User';
import { presence } from './presence.service';
import { bus } from '../events/eventBus';
import { ApiError } from '../utils/ApiError';
import type { AuthUserPayload, IRoom, RoomStatus } from '../types';

const nowIso = () => new Date().toISOString();

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveUserName(userId: string): Promise<string> {
  const user = await User.findById(userId).select('name').lean<{ name?: string } | null>();
  return user?.name ?? 'Unknown';
}

export async function createRoom(authUser: AuthUserPayload, name: string) {
  const room = await Room.create({ name, host: authUser.id, participants: [authUser.id] });
  await Participation.create({ room: room._id, user: authUser.id, role: 'host' });
  await presence.joinRoomParticipants(room._id.toString(), authUser.id);
  return getRoomById(room._id.toString());
}

export async function joinRoom(
  userId: string,
  roomId: string
): Promise<{ roomId: string; participantCount: number }> {
  const room = await Room.findOne({ _id: roomId, status: 'active' });
  if (!room) {
    const exists = await Room.exists({ _id: roomId });
    throw exists ? ApiError.conflict('Room has already ended') : ApiError.notFound('Room not found');
  }

  const isHost = room.host.equals(userId);
  const alreadyMember = room.participants.some((p: Types.ObjectId) => p.equals(userId));

  if (!alreadyMember) {
    await Room.updateOne({ _id: roomId }, { $addToSet: { participants: userId } });
    await Participation.create({
      room: roomId,
      user: userId,
      role: isHost ? 'host' : 'participant'
    });
  } else {
    const openRecord = await Participation.exists({ room: roomId, user: userId, leftAt: null });
    if (!openRecord) {
      await Participation.create({
        room: roomId,
        user: userId,
        role: isHost ? 'host' : 'participant'
      });
    }
  }

  await presence.joinRoomParticipants(roomId, userId);
  const participantCount = await presence.getParticipantCount(roomId);

  if (!alreadyMember) {
    const name = await resolveUserName(userId);
    bus.publish('room:participant-joined', { roomId, user: { userId, name }, at: nowIso() });
  }
  bus.publish('room:participant-count-changed', { roomId, participantCount, at: nowIso() });

  return { roomId, participantCount };
}

export async function leaveRoom(
  userId: string,
  roomId: string
): Promise<{ roomId: string; ended: boolean }> {
  const room = await Room.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found');

  const wasMember = room.participants.some((p: Types.ObjectId) => p.equals(userId));
  const isHost = room.host.equals(userId);

  if (wasMember) {
    await Room.updateOne({ _id: roomId }, { $pull: { participants: userId } });
    await Participation.updateMany(
      { room: roomId, user: userId, leftAt: null },
      { $set: { leftAt: new Date() } }
    );
    await presence.leaveRoomParticipants(roomId, userId);

    const name = await resolveUserName(userId);
    bus.publish('room:participant-left', { roomId, user: { userId, name }, at: nowIso() });
  }

  let ended = false;
  if (isHost && room.status === 'active') {
    ended = true;
    await Room.updateOne({ _id: roomId }, { status: 'ended', endedAt: new Date() });
    await presence.clearRoomParticipants(roomId);
    bus.publish('room:status-changed', { roomId, status: 'ended', at: nowIso() });
  } else if (wasMember) {
    const participantCount = await presence.getParticipantCount(roomId);
    bus.publish('room:participant-count-changed', { roomId, participantCount, at: nowIso() });
  }

  return { roomId, ended };
}

export async function getRoomById(roomId: string) {
  const room = await Room.findById(roomId)
    .populate('host', 'name email profileImage')
    .populate({ path: 'participants', select: 'name profileImage isOnline', options: { limit: 50 } })
    .lean<Record<string, unknown> | null>({ virtuals: true });

  if (!room) throw ApiError.notFound('Room not found');

  const liveParticipantCount = await presence.getParticipantCount(roomId);
  return { ...room, liveParticipantCount };
}

export async function listRooms(query: {
  page: number;
  limit: number;
  status?: RoomStatus;
  search?: string;
}) {
  const filter: FilterQuery<IRoom> = {};
  filter.status = query.status ?? 'active';
  if (query.search) {
    filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  const { page, limit } = query;
  const [items, total] = await Promise.all([
    Room.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('host', 'name profileImage')
      .lean<Record<string, unknown>[]>({ virtuals: true }),
    Room.countDocuments(filter)
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
  };
}
