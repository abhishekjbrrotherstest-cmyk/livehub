import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '../lib/api';
import { randomId } from '../lib/format';
import type { CountEvent, MessageEvent, ParticipantEvent, PresenceEvent, StatusEvent } from '../lib/socket';
import type { ChatMessage, PaginationMeta, RoomSummary, StoredMessage, User } from '../types';

interface ParticipantInfo {
  userId: string;
  name: string;
  profileImage?: string | null;
  isOnline?: boolean;
}

interface RoomDetail extends RoomSummary {
  liveParticipantCount: number;
  participants: User[];
}

interface JoinResult {
  roomId: string;
  participantCount: number;
}

export interface FetchRoomsArgs {
  page: number;
  search: string;
}

interface RoomsListResult {
  items: RoomSummary[];
  meta: PaginationMeta;
}

interface CurrentState {
  room: RoomSummary | null;
  loading: boolean;
  error: string | null;
  joined: boolean;
  messages: ChatMessage[];
  participants: ParticipantInfo[];
}

interface RoomsState {
  list: {
    items: RoomSummary[];
    meta: PaginationMeta | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
  };
  current: CurrentState;
  counts: Record<string, number>;
  onlineUserIds: string[];
}

const currentInitial: CurrentState = {
  room: null,
  loading: false,
  error: null,
  joined: false,
  messages: [],
  participants: []
};

const initialState: RoomsState = {
  list: { items: [], meta: null, status: 'idle' },
  current: currentInitial,
  counts: {},
  onlineUserIds: []
};

function systemMessage(roomId: string, text: string, at?: string): ChatMessage {
  return {
    id: randomId(),
    roomId,
    from: null,
    message: text,
    at: at ?? new Date().toISOString(),
    kind: 'system'
  };
}

export const fetchRooms = createAsyncThunk<RoomsListResult, FetchRoomsArgs>(
  'rooms/fetchRooms',
  async ({ page, search }) => {
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (search) params.set('search', search);
    const res = await api<RoomSummary[]>(`/rooms?${params.toString()}`);
    return {
      items: res.data,
      meta: res.meta ?? { page, limit: 12, total: res.data.length, totalPages: 1 }
    };
  }
);

export const fetchRoom = createAsyncThunk<RoomDetail, string>('rooms/fetchRoom', async (roomId) => {
  const res = await api<RoomDetail>(`/rooms/${roomId}`);
  return res.data;
});

export const joinRoomRest = createAsyncThunk<JoinResult, string, { rejectValue: string }>(
  'rooms/joinRoomRest',
  async (roomId, { rejectWithValue }) => {
    try {
      const res = await api<JoinResult>(`/rooms/${roomId}/join`, { method: 'POST' });
      return res.data;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Could not join room');
    }
  }
);

function storedToChatMessage(stored: StoredMessage): ChatMessage {
  return {
    id: stored.id,
    roomId: stored.roomId,
    from:
      stored.kind === 'system' || !stored.senderId
        ? null
        : { userId: stored.senderId, name: stored.senderName },
    message: stored.text,
    at: stored.at,
    kind: stored.kind
  };
}

export const fetchMessages = createAsyncThunk<StoredMessage[], string>(
  'rooms/fetchMessages',
  async (roomId) => {
    const res = await api<StoredMessage[]>(`/rooms/${roomId}/messages?page=1&limit=50`);
    return Array.isArray(res.data) ? res.data : [];
  }
);

function mergeHistory(state: RoomsState, roomId: string, history: StoredMessage[]): void {
  if (state.current.room?._id !== roomId) return;
  const valid = history.filter(
    (m) => m && typeof m.id === 'string' && typeof m.at === 'string' && typeof m.text === 'string'
  );
  const known = new Set(state.current.messages.map((m) => m.id));
  const incoming = valid.map(storedToChatMessage).filter((m) => !known.has(m.id));
  state.current.messages = [...incoming, ...state.current.messages].sort((a, b) =>
    (a.at ?? '').localeCompare(b.at ?? '')
  );
}

const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    resetCurrent(state) {
      Object.assign(state.current, currentInitial);
    },
    setCurrentJoined(state, action: PayloadAction<boolean>) {
      state.current.joined = action.payload;
    },
    presenceOnline(state, action: PayloadAction<PresenceEvent>) {
      const { userId } = action.payload;
      if (!state.onlineUserIds.includes(userId)) state.onlineUserIds.push(userId);
      const member = state.current.participants.find((p) => p.userId === userId);
      if (member) member.isOnline = true;
    },
    presenceOffline(state, action: PayloadAction<PresenceEvent>) {
      state.onlineUserIds = state.onlineUserIds.filter((id) => id !== action.payload.userId);
      const member = state.current.participants.find((p) => p.userId === action.payload.userId);
      if (member) member.isOnline = false;
    },
    participantJoined(state, action: PayloadAction<ParticipantEvent>) {
      const event = action.payload;
      if (state.current.room?._id === event.roomId || state.current.messages.length > 0) {
        state.current.messages.push(
          systemMessage(event.roomId, `${event.user.name} joined the room`, event.at)
        );
      }
      if (state.current.room?._id === event.roomId) {
        const exists = state.current.participants.some((p) => p.userId === event.user.userId);
        if (!exists && event.source !== 'livekit') {
          state.current.participants.push({
            userId: event.user.userId,
            name: event.user.name,
            isOnline: true
          });
        }
      }
    },
    participantLeft(state, action: PayloadAction<ParticipantEvent>) {
      const event = action.payload;
      if (state.current.room?._id === event.roomId || state.current.messages.length > 0) {
        state.current.messages.push(
          systemMessage(event.roomId, `${event.user.name} left the room`, event.at)
        );
      }
      if (state.current.room?._id === event.roomId && event.source !== 'livekit') {
        state.current.participants = state.current.participants.filter(
          (p) => p.userId !== event.user.userId
        );
      }
    },
    countUpdated(state, action: PayloadAction<CountEvent>) {
      state.counts[action.payload.roomId] = action.payload.participantCount;
    },
    statusUpdated(state, action: PayloadAction<StatusEvent>) {
      const event = action.payload;
      if (state.current.room?._id === event.roomId) {
        state.current.room.status = event.status;
        state.current.joined = false;
        state.current.messages.push(
          systemMessage(event.roomId, 'This room has ended', event.at)
        );
      }
      const listItem = state.list.items.find((room) => room._id === event.roomId);
      if (listItem) listItem.status = event.status;
      if (event.status === 'ended') state.counts[event.roomId] = 0;
    },
    messageReceived(state, action: PayloadAction<MessageEvent>) {
      const event = action.payload;
      if (!event || typeof event.roomId !== 'string') return;
      const id = event.id ?? randomId();
      if (state.current.messages.some((m) => m.id === id)) return;
      state.current.messages.push({
        id,
        roomId: event.roomId,
        from: event.from,
        message: event.message,
        at: event.at ?? new Date().toISOString(),
        kind: 'chat'
      });
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.list.status = 'loading';
      })
      .addCase(fetchRooms.fulfilled, (state, action: PayloadAction<RoomsListResult>) => {
        state.list.status = 'succeeded';
        state.list.items = action.payload.items;
        state.list.meta = action.payload.meta;
        for (const room of action.payload.items) {
          if (room.liveParticipantCount !== undefined) {
            state.counts[room._id] = room.liveParticipantCount;
          }
        }
      })
      .addCase(fetchRooms.rejected, (state) => {
        state.list.status = 'failed';
      })
      .addCase(fetchRoom.pending, (state) => {
        state.current.loading = true;
        state.current.error = null;
      })
      .addCase(fetchRoom.fulfilled, (state, action: PayloadAction<RoomDetail>) => {
        state.current.loading = false;
        state.current.room = action.payload;
        state.current.participants = action.payload.participants.map((user) => ({
          userId: user._id,
          name: user.name,
          profileImage: user.profileImage ?? null,
          isOnline: user.isOnline
        }));
        state.counts[action.payload._id] = action.payload.liveParticipantCount;
      })
      .addCase(fetchRoom.rejected, (state, action) => {
        state.current.loading = false;
        state.current.error = action.error.message ?? 'Room not found';
      })
      .addCase(joinRoomRest.fulfilled, (state, action: PayloadAction<JoinResult>) => {
        state.counts[action.payload.roomId] = action.payload.participantCount;
      })
      .addCase(joinRoomRest.rejected, (state, action) => {
        state.current.error = action.payload ?? 'Could not join room';
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        mergeHistory(state, action.meta.arg, action.payload);
      });
  }
});

export const {
  resetCurrent,
  setCurrentJoined,
  presenceOnline,
  presenceOffline,
  participantJoined,
  participantLeft,
  countUpdated,
  statusUpdated,
  messageReceived
} = roomsSlice.actions;

export default roomsSlice.reducer;
