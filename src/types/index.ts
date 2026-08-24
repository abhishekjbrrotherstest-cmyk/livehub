import type { Document, Types } from 'mongoose';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export interface AuthUserPayload {
  id: string;
  email: string;
}

export type UserRole = 'host' | 'participant';

export type RoomStatus = 'active' | 'ended';

export interface IUser extends Document<Types.ObjectId> {
  name: string;
  email: string;
  password: string;
  profileImage?: string | null;
  isOnline: boolean;
  lastSeenAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IRoom extends Document<Types.ObjectId> {
  name: string;
  host: Types.ObjectId;
  status: RoomStatus;
  participants: Types.ObjectId[];
  endedAt?: Date | null;
  participantCount: number;
}

export interface IParticipation extends Document<Types.ObjectId> {
  room: Types.ObjectId;
  user: Types.ObjectId;
  role: UserRole;
  joinedAt: Date;
  leftAt?: Date | null;
}

export type MessageKind = 'chat' | 'system';

export interface IMessage extends Document<Types.ObjectId> {
  room: Types.ObjectId;
  sender: Types.ObjectId | null;
  senderName: string;
  kind: MessageKind;
  text: string;
  createdAt: Date;
}
