import { AccessToken, WebhookReceiver, type VideoGrant, type WebhookEvent } from 'livekit-server-sdk';
import { env } from '../config/env';
import { Room } from '../models/Room';
import { presence } from './presence.service';
import { bus } from '../events/eventBus';
import type { UserRole } from '../types';

const TOKEN_TTL_SECONDS = 6 * 60 * 60;

export interface LiveKitTokenResult {
  token: string;
  serverUrl: string;
  roomName: string;
  identity: string;
  role: UserRole;
  expiresInSeconds: number;
}

export async function createLiveKitToken(params: {
  identity: string;
  name: string;
  roomName: string;
  role: UserRole;
}): Promise<LiveKitTokenResult> {
  const { identity, name, roomName, role } = params;

  const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity,
    name,
    ttl: TOKEN_TTL_SECONDS,
    metadata: JSON.stringify({ role, name })
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  };

  if (role === 'host') {
    grant.roomCreate = true;
    grant.roomAdmin = true;
    grant.hidden = false;
  }

  accessToken.addGrant(grant);

  return {
    token: await accessToken.toJwt(),
    serverUrl: env.LIVEKIT_SERVER_URL,
    roomName,
    identity,
    role,
    expiresInSeconds: TOKEN_TTL_SECONDS
  };
}

let webhookReceiver: WebhookReceiver | undefined;

export async function verifyLiveKitWebhook(rawBody: string, authHeader?: string): Promise<WebhookEvent> {
  webhookReceiver ??= new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  return webhookReceiver.receive(rawBody, authHeader);
}

export async function processLiveKitEvent(event: WebhookEvent): Promise<void> {
  const at = new Date().toISOString();

  switch (event.event) {
    case 'room_finished': {
      const roomName = event.room?.name;
      if (!roomName) return;
      const room = await Room.findById(roomName);
      if (room && room.status === 'active') {
        await Room.updateOne({ _id: room._id }, { status: 'ended', endedAt: new Date() });
        await presence.clearRoomParticipants(room._id.toString());
        bus.publish('room:status-changed', {
          roomId: room._id.toString(),
          status: 'ended',
          at
        });
      }
      break;
    }
    case 'participant_joined': {
      const roomName = event.room?.name;
      const identity = event.participant?.identity;
      if (roomName && identity) {
        bus.publish('rtc:participant-joined', { roomId: roomName, identity, at });
      }
      break;
    }
    case 'participant_left': {
      const roomName = event.room?.name;
      const identity = event.participant?.identity;
      if (roomName && identity) {
        bus.publish('rtc:participant-left', { roomId: roomName, identity, at });
      }
      break;
    }
    default:
      break;
  }
}
