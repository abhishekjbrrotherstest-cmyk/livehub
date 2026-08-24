import type { Types } from 'mongoose';
import { Room } from '../models/Room';
import { Message } from '../models/Message';
import { ApiError } from '../utils/ApiError';
import type { MessageKind } from '../types';

export interface ChatMessageView {
  id: string;
  roomId: string;
  kind: MessageKind;
  text: string;
  senderId: string | null;
  senderName: string;
  at: string;
}

export interface PaginatedMessages {
  items: ChatMessageView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface MessageLean {
  _id: Types.ObjectId;
  room: Types.ObjectId;
  sender: Types.ObjectId | null;
  senderName: string;
  kind: MessageKind;
  text: string;
  createdAt?: Date;
}

function toView(doc: MessageLean): ChatMessageView {
  return {
    id: doc._id.toString(),
    roomId: doc.room.toString(),
    kind: doc.kind,
    text: doc.text,
    senderId: doc.sender ? doc.sender.toString() : null,
    senderName: doc.senderName,
    at: (doc.createdAt ?? new Date()).toISOString()
  };
}

export async function createMessage(params: {
  roomId: string;
  senderId?: string | null;
  senderName: string;
  text: string;
  kind?: MessageKind;
}): Promise<ChatMessageView> {
  const roomExists = await Room.exists({ _id: params.roomId });
  if (!roomExists) throw ApiError.notFound('Room not found');

  const doc = await Message.create({
    room: params.roomId,
    sender: params.senderId ?? null,
    senderName: params.senderName,
    kind: params.kind ?? 'chat',
    text: params.text
  });

  return toView(doc.toObject() as unknown as MessageLean);
}

export async function listMessages(roomId: string, page: number, limit: number): Promise<PaginatedMessages> {
  const roomExists = await Room.exists({ _id: roomId });
  if (!roomExists) throw ApiError.notFound('Room not found');

  const filter = { room: roomId } as const;
  const total = await Message.countDocuments(filter);
  const docs = await Message.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<MessageLean[]>();

  return {
    items: docs.reverse().map(toView),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}
