export interface User {
  _id: string;
  name: string;
  email: string;
  profileImage?: string | null;
  isOnline?: boolean;
}

export interface RoomHost {
  _id?: string;
  id?: string;
  name?: string;
  profileImage?: string | null;
}

export interface RoomSummary {
  _id: string;
  name: string;
  status: 'active' | 'ended';
  createdAt: string;
  host: RoomHost | string;
  participantCount?: number;
  liveParticipantCount?: number;
  endedAt?: string | null;
}

export interface ParticipantInfo {
  userId: string;
  name: string;
  profileImage?: string | null;
  isOnline?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  from: { userId: string; name: string } | null;
  message: string;
  at: string;
  kind: 'chat' | 'system';
}

export interface StoredMessage {
  id: string;
  roomId: string;
  kind: 'chat' | 'system';
  text: string;
  senderId: string | null;
  senderName: string;
  at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface AuthData {
  user: User;
  token: string;
}

export interface LiveKitTokenData {
  token: string;
  serverUrl: string;
  roomName: string;
  identity: string;
  role: 'host' | 'participant';
  expiresInSeconds: number;
}
